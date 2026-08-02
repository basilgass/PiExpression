# Analyse du module `src` — PiExpression

> Objectif : solidifier et tester `PiExpression` de façon systématique. Ce module
> est central dans PiMath, donc dans Scolcours ; il doit être le plus rigoureux et
> sûr possible.
>
> Date de l'analyse : 2026-08-02 — version `0.1.4`
> Périmètre : `src/` (parseur Shunting-Yard + évaluateur numérique).
> État des tests au moment de l'analyse : **30 tests, tous verts**, mais voir §4
> (les tests ne vérifient pas ce qu'ils prétendent vérifier).

---

## 1. Cartographie du module

```
src/
├── index.ts                     # points d'entrée exportés
├── piexpression.types.ts        # enums, types, constantes (pi, e)
├── shutingyard.ts               # ShutingYard : infixe -> RPN (Shunting-Yard)
├── normalize.ts                 # pré-traitement : insertion des '*' implicites
├── numexp.ts                    # NumExp : évaluation numérique de la RPN
└── TokenConfig/
    ├── TokenConfigDefault.ts    # opérateurs de base (mode POLYNOM)
    ├── TokenConfigNumeric.ts    # + fonctions (sin, cos, sqrt, ln, logn…) + %
    ├── TokenConfigExpression.ts # + séparateur d'arguments ','
    └── TokenConfigSet.ts        # algèbre d'ensembles (& | ! -)
```

**Flux de données :**

```
"3x+5"
   │  normalize()      -> "3*x+5"          (insère les * implicites)
   │  ShutingYard.parse -> [3, x, *, 5, +]  (RPN, tableau de Token)
   │  NumExp.evaluate   -> 20               (dépile la RPN avec {x:5})
   ▼
```

Quatre **modes** (`ShutingyardMode`) sélectionnent une table de tokens :
`POLYNOM` (défaut), `NUMERIC`, `EXPRESSION`, `SET`.

---

## 2. Problèmes confirmés empiriquement (sondes exécutées)

Chaque ligne ci-dessous a été **reproduite** par une sonde de test jetable, pas
seulement déduite de la lecture.

### 🔴 P1 — Troncature silencieuse des expressions longues (**le plus grave**)

`shutingyard.ts:135` : `securityLoopLvl1 = 50`. La boucle principale de `parse()`
s'arrête après **50 itérations**, quel que soit l'expression, avec un simple
`console.log('SECURITY LEVEL 1 EXIT')` puis `break`. L'analyse est alors
**tronquée**, la RPN est partielle, et l'évaluation retourne un résultat **faux
sans lever d'erreur**.

Sonde : `1+1+…` (40 termes, 79 caractères) → retourne **`25`** au lieu de `40`.

Les limites internes de désempilement (`securityLoopLvl2_default = 50`) souffrent
du même défaut : elles cassent la logique de l'algorithme au lieu de refléter une
vraie borne mathématique. Pour un module utilisé dans un contexte pédagogique,
tronquer silencieusement un polynôme un peu long est inacceptable.

**Correctif attendu :** supprimer ces garde-fous ou les remplacer par une borne
proportionnelle à `expr.length` **qui lève une erreur** au lieu de `break`. La
boucle Shunting-Yard est intrinsèquement bornée (chaque itération consomme au
moins un caractère via `NextToken`) : le garde-fou anti-boucle-infinie devrait
porter sur « `tokenPos` a-t-il progressé ? », pas sur un compteur magique.

### 🔴 P2 — Crash sur entrée mal formée (ordre des conditions)

`shutingyard.ts:197` et `:217` :

```ts
while (opStack[opStack.length - 1].token !== '(' && opStack.length > 0) { … }
```

L'accès `opStack[opStack.length - 1].token` est évalué **avant** le test
`opStack.length > 0`. Sur une pile vide, `opStack[-1]` vaut `undefined` →
`TypeError: Cannot read properties of undefined (reading 'token')`.

Sondes : `,3` (virgule initiale) et `)3` (parenthèse fermante orpheline) →
**crash** au lieu d'un message d'erreur exploitable. La condition doit être
inversée (`opStack.length > 0 && …`), mais cela ne fait que déplacer le vrai
problème : l'absence de validation syntaxique (voir P4).

### 🔴 P3 — Parenthèses non équilibrées acceptées silencieusement

Aucune validation d'appariement des parenthèses. `parse()` fait
`this.#rpn = outQueue.concat(opStack.reverse())` : une `(` restée sur la pile est
simplement recopiée dans la RPN et ignorée à l'évaluation.

Sonde : `(3+2` → retourne **`5`** silencieusement (aucune erreur).
`RIGHT_PARENTHESIS` utilise `opStack.length > 1` (`shutingyard.ts:217`, avec le
commentaire révélateur `/*Maybe zero !? */`) : off-by-one qui laisse traîner des
parenthèses.

### 🔴 P4 — Opérateur `%` déclaré mais non évalué

`TokenConfigNumeric.ts:9` déclare `%` (precedence 3, associatif **à droite** —
étrange pour un modulo qui est associatif à gauche). Mais `numexp.ts` ne traite
jamais `%` dans le `switch` des opérations : le token est parsé, poussé, puis
aucun `stack.push` n'a lieu → déséquilibre de pile.

Sonde : `5%3` → `Error: The multiplication factors a or 5 are not defined`
(message trompeur, sans rapport avec `%`).

C'est le symptôme d'un problème plus large : **la liste d'opérateurs/fonctions
supportés est dupliquée** entre les `TokenConfig` (déclaration) et le `switch`
géant de `numexp.ts` (implémentation), sans garantie de cohérence. Un opérateur
peut exister d'un côté et pas de l'autre.

### 🟠 P5 — Espaces non gérés

`normalize()` ne supprime pas les espaces. Sonde : `3 + 5` → erreur. Un `trim` +
suppression des espaces internes est trivial et attendu par tout utilisateur.

### 🟠 P6 — `console.log` / `console.warn` en production

`shutingyard.ts` : lignes 102, 141, 178, 200, 220. `numexp.ts:19`. Une
bibliothèque ne doit pas polluer la sortie de l'application hôte. Ces logs
signalent aussi des chemins d'erreur qui devraient être des exceptions typées.

---

## 3. Problèmes de conception (rigueur & sûreté)

### C1 — Philosophie « échec silencieux » au lieu de *fail-fast*

Le fil rouge de tous les bugs ci-dessus. Le module retourne des valeurs par
défaut (`?? 0`, `?? { token: '', … }`, `push(NaN)`, `break`) là où il devrait
lever une erreur typée. Recommandation : définir une hiérarchie d'erreurs
(`ParseError`, `EvaluationError`, `DomainError`) et une frontière claire — la RPN
produite par `parse()` doit être **structurellement valide ou lever**.

### C2 — `isValid` est un heuristique fragile et à effet de bord

`numexp.ts:28` : `isValid` évalue l'expression en `{x: 2}` et considère « valide »
si aucune exception n'est levée. Problèmes :
- une expression valide mais hors domaine en `x=2` (`sqrt(x-10)`) renvoie `NaN`
  sans lever → considérée « valide » (ce qui est correct ici, mais le mécanisme
  est accidentel) ;
- une expression à variable nommée autrement que `x` est mal jugée ;
- l'appel **mute** `_isValid` et met en cache — un getter ne devrait pas avoir
  d'effet de bord observable.

La validité **structurelle** (la RPN dépile-t-elle vers exactement 1 valeur ?)
devrait être déterminée à la construction, indépendamment de toute valeur de
variable.

### C3 — Duplication des tables de tokens

`TokenConfigDefault`, `Numeric`, `Expression` partagent 90 % de leurs entrées par
copier-coller. Divergences faciles (ex. `nthrt` présent en Numeric mais absent en
Expression ; `logn` présent des deux côtés mais `log`/`ln` seulement en Numeric).
Recommandation : composer les tables (`{...OPERATORS, ...FUNCTIONS}`) à partir de
briques uniques.

### C4 — Typage trop lâche

- `associative: string` devrait être `'left' | 'right'`.
- `numexp.ts:24` : le getter `rpn` annonce `{token, tokenType: string}[]` alors
  que le champ réel est `ShutingyardType` — type mensonger.
- `NextToken` renvoie un tuple positionnel `[string, number, ShutingyardType]` :
  fragile, un objet nommé serait plus sûr.
- La branche `default` de `NextToken` (`shutingyard.ts:101`) fabrique un token de
  type `MONOM` que `evaluate` ne sait pas traiter → cul-de-sac silencieux.

### C5 — Limitations fonctionnelles à documenter (ou lever)

- **Variables mono-caractère uniquement** (`/^([a-zA-Z])/`, `shutingyard.ts:98`).
  `ab` devient `a*b`. Cohérent avec le mode polynôme, mais interdit les variables
  nommées (`x1`, `theta`).
- **`e` est toujours la constante d'Euler**, jamais une variable.
- **Signe moins unaire** géré seulement juste après `(` par un hack qui pousse un
  `0` (`shutingyard.ts:210`). `-x` en tête d'expression fonctionne par accident
  (soustraction avec `a = pop() ?? 0`). À rendre explicite et testé.
- **Division par zéro** → `Infinity` (P?/§2 : à décider — lever `DomainError` ou
  documenter le retour `Infinity`/`NaN`).
- `_numberCorrection` arrondit **systématiquement** à 8 décimales
  (`numexp.ts:180`) : perte de précision silencieuse sur les grands nombres,
  comportement surprenant. À rendre configurable / documenté.

### C6 — Robustesse de `normalize`

Le pré-traitement par `replaceAll` (enveloppement `sin2` → `sin(2)`,
`normalize.ts:34`) est un traitement ad hoc fragile, exécuté avant la boucle
principale qui refait un travail similaire. Cas piégeux : `sinx` (fonction sans
parenthèse) devient `s*i*n*x`. À couvrir par des tests explicites, ou à unifier
avec la tokenisation.

---

## 4. Qualité des tests existants (point critique)

Les 30 tests passent, mais **la plupart ne vérifient pas ce qu'ils prétendent** :

`shutingyard.test.ts` et `numexp.test.ts` utilisent
`expect(...).to.have.all.members([...])`. `.members` de Chai teste l'égalité
d'ensemble **sans tenir compte de l'ordre**. Or **l'ordre est toute l'information
d'une RPN** : `['3','x','+']` et `['x','3','+']` passeraient le même test alors
que la seconde est fausse. Ces tests valident le *contenu* mais pas la
*structure* de la sortie de l'algorithme.

➡️ **Correctif prioritaire :** remplacer `.to.have.all.members` par
`.to.deep.equal` / `toEqual` (comparaison ordonnée) partout où l'on teste une RPN
ou une chaîne normalisée.

Autres manques :
- Aucun test d'**erreur** (entrées mal formées, parenthèses déséquilibrées,
  tokens inconnus) — précisément la zone la plus fragile.
- Aucun test de **cas limites** : chaîne vide, espaces, expression longue (>50),
  imbrication profonde, `%`, moins unaire, division par zéro.
- Pas de mesure de **couverture** (`vitest --coverage` non configuré).
- Pas d'intégration continue (aucun workflow détecté).
- Le mode `SET` n'est testé que par 2 assertions ; `TokenConfigSet` (opérateur `!`
  unaire) n'est pas évalué du tout (pas d'évaluateur d'ensembles).

---

## 5. Plan d'action recommandé (par priorité)

### Étape 0 — Filet de sécurité (avant toute modification) — ✅ FAIT (2026-08-02)
1. ✅ `.to.have.all.members` remplacé par `.to.deep.equal` (ordonné) dans
   `shutingyard.test.ts` et `numexp.test.ts`. Les 30 tests restent verts : les
   tableaux attendus étaient par chance déjà dans le bon ordre, donc aucun bug
   caché révélé — mais l'ordre de la RPN est désormais réellement vérifié. Les
   sorties ont été comparées à une dérivation RPN faite à la main avant
   remplacement (priorités `^` > `*` > `+`, associativité, moins unaire).
2. ✅ Couverture activée : provider `@vitest/coverage-v8`, config dans
   `vite.config.js` (`test.coverage`), script `npm run test:coverage`, dossier
   `coverage/` ignoré par git.

   **Référence initiale (30 tests) :**

   | Fichier          | % Stmts | % Branch | % Funcs | % Lines |
   |------------------|---------|----------|---------|---------|
   | **Global**       | 83.01   | 74.56    | 84.61   | 82.50   |
   | normalize.ts     | 98.66   | 91.83    | 100     | 98.38   |
   | numexp.ts        | 67.59   | 64.54    | 71.42   | 67.59   |
   | shutingyard.ts   | 84.34   | 78.08    | 75      | 84.95   |

   `numexp.ts` est le maillon faible (les branches d'erreur et plusieurs
   opérateurs/fonctions ne sont pas exercés) — cohérent avec les bugs P4 et C1.

### Étape 1 — Corriger les bugs 🔴 (avec tests de non-régression en TDD)
3. **P1** : retirer la limite fixe de 50 ; garde-fou basé sur la progression de
   `tokenPos`, erreur explicite si blocage.
4. **P2** : inverser l'ordre des conditions des `while` (`length` d'abord).
5. **P4** : implémenter `%` dans `evaluate` **ou** le retirer de la config ;
   ajouter un test « chaque token déclaré dans une TokenConfig est évaluable ».
6. **P3** : valider l'appariement des parenthèses en fin de `parse()` → erreur.

### Étape 2 — Solidifier l'API
7. Introduire des erreurs typées (`ParseError`, `EvaluationError`, `DomainError`)
   et supprimer les `console.*` (C1, P6).
8. Rendre `isValid` purement structurel et sans effet de bord (C2).
9. Gérer les espaces dans `normalize` (P5).

### Étape 3 — Refactor de rigueur
10. Factoriser les `TokenConfig` (C3) et durcir les types (C4).
11. Documenter/expliciter les limitations (C5) et les couvrir par des tests.

### Étape 4 — Batterie de tests systématique
12. Tests par **table** (entrée → RPN attendue / valeur attendue) couvrant :
    opérateurs, priorités, associativité, fonctions, constantes, moins unaire,
    parenthèses imbriquées, fractions, multiplication implicite.
13. Tests d'erreurs exhaustifs (cf. §4).
14. Tests de **propriété** (fuzzing léger) : générer des expressions valides,
    vérifier que `parse` ne crashe jamais et que `evaluate` est cohérent
    (ex. comparer à `Function`/mathjs sur un échantillon).
15. Viser une couverture ≥ 95 % des branches de `shutingyard.ts` et `numexp.ts`.

---

## 6. Synthèse

| Réf | Sévérité | Problème | Effet observé |
|-----|----------|----------|----------------|
| P1  | 🔴 | Limite fixe de 50 itérations | Résultat faux silencieux sur expr. longue |
| P2  | 🔴 | Ordre des conditions `while` | Crash `undefined.token` sur entrée mal formée |
| P3  | 🔴 | Parenthèses non validées | `(3+2` → `5` sans erreur |
| P4  | 🔴 | `%` déclaré, non évalué | Erreur trompeuse |
| P5  | 🟠 | Espaces non gérés | `3 + 5` échoue |
| P6  | 🟠 | `console.*` en prod | Pollution de sortie |
| C1  | 🔴 | Échec silencieux généralisé | Résultats faux non signalés |
| C2  | 🟠 | `isValid` heuristique + effet de bord | Validité peu fiable |
| C3  | 🟡 | Tables de tokens dupliquées | Divergences (`log`/`ln`/`nthrt`) |
| C4  | 🟡 | Typage lâche | Sécurité de type illusoire |
| C5  | 🟡 | Limitations non documentées | Surprises pour l'appelant |
| §4  | 🔴 | Tests insensibles à l'ordre RPN | Faux sentiment de couverture |

**Message clé** : le module *fonctionne* sur les cas nominaux mais échoue
silencieusement dès que l'entrée s'écarte du chemin heureux. Pour un composant
central, la priorité n°1 est de passer d'une logique de tolérance silencieuse à
une logique *fail-fast* + une suite de tests qui vérifie réellement la structure
de la sortie (ordre RPN) et couvre systématiquement les cas d'erreur.
