# Analyse du module `src` — PiExpression

> Objectif : solidifier et tester `PiExpression` de façon systématique. Ce module
> est central dans PiMath, donc dans Scolcours ; il doit être le plus rigoureux et
> sûr possible.
>
> Date de l'analyse : 2026-08-02 — version `0.1.4`
> Périmètre : `src/` (parseur Shunting-Yard + évaluateur numérique).
> État des tests au moment de l'analyse : **30 tests, tous verts**, mais voir §4
> (les tests ne vérifient pas ce qu'ils prétendent vérifier).
>
> **État actuel (après Étapes 0, 1 et 2) : 62 tests, tous verts ; lint et
> typecheck à zéro erreur.** Les bugs 🔴 P1–P4 sont corrigés, ainsi que P5, P6,
> C1 (erreurs typées) et C2 (`isValid` refondu). Restent C3–C6 (Étape 3) et la
> batterie de tests systématique (Étape 4). Voir §5 pour l'avancement et §6 pour
> l'état par référence.

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

### ✅ P1 — Troncature silencieuse des expressions longues (**le plus grave**) — CORRIGÉ (Étape 1)

> **Corrigé** : le compteur fixe est supprimé. La boucle principale
> (`shutingyard.ts:134`) vérifie que `tokenPos` progresse et lève
> `Error("Parser stalled…")` sinon ; les 3 boucles internes n'ont plus de
> compteur. Description d'origine conservée ci-dessous pour l'historique.

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

### ✅ P2 — Crash sur entrée mal formée (ordre des conditions) — CORRIGÉ (Étape 1)

> **Corrigé** : ordre des conditions inversé (`opStack.length > 0` **avant**
> l'accès à `opStack[len-1].token`) dans les cas `FUNCTION_ARGUMENT`
> (`shutingyard.ts:194`) et `RIGHT_PARENTHESIS` (`shutingyard.ts:213`). Plus de
> `TypeError` sur entrée mal formée. Description d'origine ci-dessous.

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

### ✅ P3 — Parenthèses non équilibrées acceptées silencieusement — CORRIGÉ (Étape 1)

> **Corrigé** : validation d'appariement ajoutée. `RIGHT_PARENTHESIS` lève
> `Mismatched parentheses (unexpected ')')` si aucune `(` n'est trouvée
> (`shutingyard.ts:218`) ; en fin de `parse()`, toute `(` restée sur la pile
> lève `Mismatched parentheses (unclosed '(')` (`shutingyard.ts:237`), et un
> séparateur `,` hors parenthèses lève `Misplaced argument separator`
> (`shutingyard.ts:199`). Description d'origine ci-dessous.

Aucune validation d'appariement des parenthèses. `parse()` fait
`this.#rpn = outQueue.concat(opStack.reverse())` : une `(` restée sur la pile est
simplement recopiée dans la RPN et ignorée à l'évaluation.

Sonde : `(3+2` → retourne **`5`** silencieusement (aucune erreur).
`RIGHT_PARENTHESIS` utilise `opStack.length > 1` (`shutingyard.ts:217`, avec le
commentaire révélateur `/*Maybe zero !? */`) : off-by-one qui laisse traîner des
parenthèses.

### ✅ P4 — Opérateur `%` déclaré mais non évalué — CORRIGÉ (Étape 1)

> **Corrigé** sur toute la chaîne : associativité `right` → `left` dans
> `TokenConfigNumeric`/`TokenConfigExpression`, cas `%` ajouté au `switch` de
> `normalize.ts:115`, branche modulo ajoutée à `evaluate` (`numexp.ts:115`). Un
> test-garde `Config/evaluator consistency` vérifie que tout opérateur déclaré
> dans le config numérique est évaluable (empêche la réapparition de cette classe
> de bug). Description d'origine ci-dessous.

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

### ✅ P5 — Espaces non gérés — CORRIGÉ (Étape 2)

> **Corrigé** : `normalize()` supprime désormais tout blanc (`expr.replace(/\s+/g,
> '')`) en tête de fonction. `3 + 5`, `2 * ( 3 + 4 )`, tabulations comprises,
> s'évaluent normalement. Description d'origine ci-dessous.

`normalize()` ne supprime pas les espaces. Sonde : `3 + 5` → erreur. Un `trim` +
suppression des espaces internes est trivial et attendu par tout utilisateur.

### ✅ P6 — `console.log` / `console.warn` en production — CORRIGÉ (Étape 2)

> **Corrigé** : tous les `console.*` supprimés de `src`. Les chemins d'erreur
> qu'ils signalaient sont devenus des exceptions typées (voir C1). Description
> d'origine ci-dessous.

`shutingyard.ts` : lignes 102, 141, 178, 200, 220. `numexp.ts:19`. Une
bibliothèque ne doit pas polluer la sortie de l'application hôte. Ces logs
signalent aussi des chemins d'erreur qui devraient être des exceptions typées.

---

## 3. Problèmes de conception (rigueur & sûreté)

### 🟡 C1 — Philosophie « échec silencieux » au lieu de *fail-fast* — LARGEMENT TRAITÉ (Étape 2)

> **Traité** : hiérarchie `PiExpressionError` créée (`src/errors.ts`) avec
> `ParseError`, `EvaluationError`, `VariableError` (sous-classe de la
> précédente) et `DomainError` (réservée). `parse()` lève des `ParseError`,
> `evaluate()` des `EvaluationError`/`VariableError`, et le constructeur de
> `NumExp` préserve la cause (`{ cause: e }`). `console.*` supprimés (P6).
> **Reste** : `DomainError` n'est pas encore levée (division par zéro →
> `Infinity`, `sqrt(-1)` → `NaN` restent silencieux, cf. C5) — à décider en
> Étape 3.

Le fil rouge de tous les bugs ci-dessus. Le module retourne des valeurs par
défaut (`?? 0`, `?? { token: '', … }`, `push(NaN)`, `break`) là où il devrait
lever une erreur typée. Recommandation : définir une hiérarchie d'erreurs
(`ParseError`, `EvaluationError`, `DomainError`) et une frontière claire — la RPN
produite par `parse()` doit être **structurellement valide ou lever**.

### ✅ C2 — `isValid` est un heuristique fragile et à effet de bord — CORRIGÉ (Étape 2)

> **Corrigé** : `isValid` n'est plus un getter à effet de bord évaluant en
> `{x: 2}`. C'est maintenant une **méthode pure** `isValid(values?)` qui combine
> (a) validité **structurelle** (simulation des arités : la RPN se réduit-elle à
> une seule valeur ?) et (b) **couverture des variables** (toutes les variables
> libres sont-elles fournies ?), indépendamment du nom des variables. Ajout d'un
> getter `variables: string[]` (variables libres, dédupliquées) et fail-fast
> `VariableError` dans `evaluate` quand une variable manque. Description
> d'origine ci-dessous.

### C2 (origine) — `isValid` est un heuristique fragile et à effet de bord

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

### Étape 1 — Corriger les bugs 🔴 — ✅ FAIT (2026-08-02, TDD)
Nouveau fichier `tests/robustness.test.ts` (cas d'erreur et limites). Chaque
correctif a été piloté par un test rouge d'abord.

3. ✅ **P1** : limite fixe de 50 supprimée dans `shutingyard.ts`. La boucle
   principale vérifie désormais que `tokenPos` progresse à chaque itération et
   lève `Error("Parser stalled…")` sinon. Les 3 boucles internes de désempilement
   n'ont plus de compteur arbitraire (elles sont bornées par la taille de la
   pile). Test : `1+1+…` (40 termes) = `40` (au lieu de `25`).
   ⚠️ Piège rencontré : sans `}` avant la déstructuration
   `[token, tokenPos, tokenType] = …`, l'ASI la rattache à la ligne précédente
   (`tokenPos[…]`). Corrigé par un `;` protecteur en tête de ligne.
4. ✅ **P2** : ordre des conditions inversé (`opStack.length > 0` **avant** l'accès
   `opStack[len-1].token`) dans `FUNCTION_ARGUMENT` et `RIGHT_PARENTHESIS`. Plus
   de `TypeError` sur entrée mal formée.
5. ✅ **P4** : `%` implémenté sur toute la chaîne — associativité corrigée
   (`right` → `left`) dans `TokenConfigNumeric`/`Expression`, cas `%` ajouté au
   `switch` de `normalize`, branche modulo ajoutée à `evaluate`. Test-garde
   `Config/evaluator consistency` : tout opérateur déclaré dans le config numérique
   doit être évaluable (empêche la réapparition de la classe de bug).
6. ✅ **P3** : parenthèses/séparateurs validés → erreurs explicites
   (`Mismatched parentheses (unexpected ')')`, `(unclosed '(')`,
   `Misplaced argument separator ','`) au lieu d'un résultat silencieux ou d'un
   crash.

**Résultat :** 40 tests verts (était 30). Couverture : global 86.3 % stmts /
77.4 % branch (était 83.0 / 74.6) ; `shutingyard.ts` 91.3 % / 84.9 % (était
84.3 / 78.1). Typecheck de production (`tsc -p tsconfig-build.json`) OK.
`numexp.ts` reste le maillon faible (71 %) — cible de l'Étape 2.

### Étape 2 — Solidifier l'API — ✅ FAIT (2026-08-02, TDD)
7. ✅ Erreurs typées introduites dans `src/errors.ts` : `PiExpressionError`
   (base) → `ParseError`, `EvaluationError` → `VariableError`, `DomainError`
   (réservée). `parse()` lève `ParseError` ; `evaluate()` lève
   `EvaluationError`/`VariableError` ; le constructeur `NumExp` préserve la cause
   (`{ cause: e }`). Tous les `console.*` supprimés de `src` (P6, C1).
8. ✅ `isValid` refondu (C2) : de getter à effet de bord (évaluation en `{x:2}`)
   vers **méthode pure** `isValid(values?)` = validité structurelle (arités) +
   couverture des variables. Nouveau getter `variables`, fail-fast
   `VariableError` dans `evaluate`. Les 2 anciens tests `isValid` (qui encodaient
   l'heuristique) ont été réécrits ; la détection « fonction sans parenthèses »
   (`3*sin` → `3*s*i*n`) est reconnue comme relevant de C6, pas de `isValid`.
9. ✅ Espaces gérés dans `normalize` (P5) : `expr.replace(/\s+/g, '')`.

**Résultat :** 62 tests verts (était 40). Nouveaux fichiers de tests
`tests/errors.test.ts` et `tests/isvalid.test.ts`, ajouts à `robustness.test.ts`.
Couverture : global 90.1 % stmts / 76.2 % branch (était 86.3 / 77.4) ;
`numexp.ts` 81.1 % (était 71). Lint **0 erreur** (les 5 erreurs pré-existantes
résolues au passage : `preserve-caught-error` via `{ cause }`, les `+` superflus,
`no-useless-assignment`). Typecheck (`tsc -p tsconfig-build.json`) OK.

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

| Réf | Sévérité | Problème | Effet observé | État |
|-----|----------|----------|----------------|------|
| P1  | 🔴 | Limite fixe de 50 itérations | Résultat faux silencieux sur expr. longue | ✅ Corrigé (Étape 1) |
| P2  | 🔴 | Ordre des conditions `while` | Crash `undefined.token` sur entrée mal formée | ✅ Corrigé (Étape 1) |
| P3  | 🔴 | Parenthèses non validées | `(3+2` → `5` sans erreur | ✅ Corrigé (Étape 1) |
| P4  | 🔴 | `%` déclaré, non évalué | Erreur trompeuse | ✅ Corrigé (Étape 1) |
| P5  | 🟠 | Espaces non gérés | `3 + 5` échoue | ✅ Corrigé (Étape 2) |
| P6  | 🟠 | `console.*` en prod | Pollution de sortie | ✅ Corrigé (Étape 2) |
| C1  | 🔴 | Échec silencieux généralisé | Résultats faux non signalés | 🟡 Largement traité (reste `DomainError`, cf. C5) |
| C2  | 🟠 | `isValid` heuristique + effet de bord | Validité peu fiable | ✅ Corrigé (Étape 2) |
| C3  | 🟡 | Tables de tokens dupliquées | Divergences (`log`/`ln`/`nthrt`) | ⬜ Ouvert (Étape 3) |
| C4  | 🟡 | Typage lâche | Sécurité de type illusoire | ⬜ Ouvert (Étape 3) |
| C5  | 🟡 | Limitations non documentées | Surprises pour l'appelant | ⬜ Ouvert (Étape 3) |
| §4  | 🔴 | Tests insensibles à l'ordre RPN | Faux sentiment de couverture | ✅ Corrigé (Étape 0) |
| ENV | 🟠 | ESLint cassé (`@eslint/js` manquant) | `npx eslint` échoue, lint indisponible | ✅ Corrigé (voir §7) |

**Message clé** : le module *fonctionne* sur les cas nominaux mais échoue
silencieusement dès que l'entrée s'écarte du chemin heureux. Pour un composant
central, la priorité n°1 est de passer d'une logique de tolérance silencieuse à
une logique *fail-fast* + une suite de tests qui vérifie réellement la structure
de la sortie (ordre RPN) et couvre systématiquement les cas d'erreur.

---

## 7. Point d'environnement — ESLint — ✅ CORRIGÉ (2026-08-02)

**Symptôme initial** : `npx eslint` échouait immédiatement :

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package '@eslint/js'
    imported from C:\websites\PiExpression\eslint.config.js
```

**Cause** : `eslint.config.js:1` fait `import eslint from "@eslint/js"`, mais le
paquet `@eslint/js` n'était **ni installé** (absent de `node_modules/@eslint/`, qui
ne contenait que `config-array`, `config-helpers`, `core`, `object-schema`,
`plugin-kit`) **ni déclaré** dans les `devDependencies` de `package.json`. Depuis
ESLint 9/10, `@eslint/js` (qui fournit `eslint.configs.recommended`) est un paquet
séparé qu'il faut installer explicitement.

**Corrigé** :
1. `npm i -D @eslint/js` — lint de nouveau opérationnel.
2. Migration `eslint.config.js` de `typescriptEslint.config()` (déprécié) vers
   `defineConfig()` importé de `eslint/config` ; suppression des spreads `...`
   dans `extends` (aplatis nativement). Les règles type-aware restent actives.
3. `npx eslint src --fix` appliqué (10 erreurs auto-corrigées, surtout `one-var`),
   puis indentation des déclarations découpées rétablie à la main.

**Lint désormais à 0 erreur** (2026-08-02). Les 5 erreurs restantes ont été
résolues pendant l'Étape 2 :
- `preserve-caught-error` (`numexp.ts`) → relancé avec `{ cause: e }` (C1/P6) ;
- `@typescript-eslint/no-unnecessary-type-conversion` ×3 → `+` superflus retirés
  lors de la réécriture de `evaluate` ;
- `no-useless-assignment` (`shutingyard.ts`) → `let token = ''` → `let token: string`.
