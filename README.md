# WokThai

Monorepo pour une application de commande de restauration (livraison et retrait) : **app mobile** pour les clients et **dashboard web** pour le personnel et l’administration. Le backend repose sur **Supabase** (PostgreSQL, Auth).

## Stack

| Partie | Technologie |
|--------|-------------|
| Mobile | [Expo](https://expo.dev/) (React Native, Expo Router) |
| Dashboard | [Next.js](https://nextjs.org/) 16, React 19, Tailwind CSS 4 |
| Partagé | Package `@wokthai/shared` (types, services, React Query) |
| Données | [Supabase](https://supabase.com/) |

Gestionnaire de paquets : **pnpm** 9.

## Structure

```
apps/
  mobile/      # Application client (Expo)
  dashboard/   # Interface staff / admin (Next.js)
packages/
  shared/      # Code partagé entre mobile et dashboard
supabase/
  migrations/  # Schéma SQL (à appliquer sur votre projet Supabase)
```

## Prérequis

- [Node.js](https://nodejs.org/) (LTS recommandé)
- [pnpm](https://pnpm.io/) 9 (`corepack enable` puis utilisation de la version du `package.json`)
- Un projet [Supabase](https://supabase.com/) (URL + clés API)
- Pour le mobile : [Expo Go](https://expo.dev/go) ou un émulateur iOS / Android

## Installation

```bash
git clone https://github.com/MedChaaben/wokthai_app.git
cd wokthai_app
pnpm install
```

## Variables d’environnement

Copiez `.env.example` vers `.env.local` à la **racine** du monorepo (utilisé par l’app mobile via `app.config.js`), et créez `apps/dashboard/.env.local` pour le dashboard.

| Fichier | Variables |
|---------|-----------|
| Racine `.env.local` | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` |
| `apps/dashboard/.env.local` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` ; optionnel : `SUPABASE_SERVICE_ROLE_KEY` (invitations staff depuis **Administration → Équipe** — ne jamais exposer côté client) |

## Base de données

Les migrations SQL se trouvent dans `supabase/migrations/`. Appliquez-les sur votre base (par exemple via l’éditeur SQL Supabase ou la CLI Supabase), **dans l’ordre des fichiers**, pour recréer le schéma (utilisateurs, magasins, menu, commandes, staff, rôles admin plateforme, etc.).

## Commandes

| Commande | Description |
|----------|-------------|
| `pnpm dev:mobile` | Démarre le serveur de développement Expo |
| `pnpm dev:dashboard` | Lance Next.js en mode développement |
| `pnpm build:dashboard` | Build de production du dashboard |
| `pnpm lint` | Vérification TypeScript (`tsc --noEmit`) sur les workspaces |

Dans `apps/mobile`, vous pouvez aussi utiliser `pnpm android`, `pnpm ios` ou `pnpm web` selon la cible Expo.

## Licence

Projet privé ; aucune licence publique n’est définie pour le moment.
