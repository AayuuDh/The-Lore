# Product Requirements: Move to Database (Cosmos DB)

**The Lore**  |  Owner: Erk (PM)  |  Status: Planned (building for real)

## 1. Problem

Skills currently live as `.md` files in `data/skills/` on whatever machine the
backend happens to run on. That works for one local copy, but it breaks the
moment we want this to be real:

- A skill saved on the server's disk is **lost on restart / redeploy**.
- A person on another machine **can't see** skills someone else added.
- Multiple backend instances would each have their **own separate** files.
- There's nowhere to attach **ownership** ("who created this skill"), which we
  need as the foundation for accounts and "My Skills".

`.md` files are fine as a seed catalog. They are not a real store.

## 2. Goal

Move the skill store from local `.md` files to **Azure Cosmos DB (NoSQL / Core
API)** so skills live in one shared, always-on place that survives restarts,
is visible to everyone hitting the same backend, and can carry an owner field
for the future accounts layer.

## 3. Non-goals (explicitly out of scope)

- **NOT** building accounts / login in this pass. Identity already exists via
  MSAL; wiring per-user "My Skills" is a later layer on top of this one.
- **NOT** moving search into the database. Matching stays in memory
  (model2vec embeddings); Cosmos only replaces *where skills come from*.
- **NOT** storing the embedding vectors in Cosmos. Vectors are recomputed in
  memory on startup, same as today.
- **NOT** editing or deleting existing skills (creation + read only, same as
  the current feature).

## 4. Approach

Once Azure Cosmos DB is set up, do **one migration pass** to bring every
existing `.md` file into Cosmos. From then on, change `load_skills` and
`save_skill` to talk to Cosmos instead of the local `data/` folder. Data flows
to and from Cosmos instead of us reaching into the file system.

The whole reason this is a small change: all storage logic is already sealed
inside two functions in `matching/skills_loader.py`. We swap their **insides**
only — the endpoints, the AI drafting, and the UI never notice.

## 5. Data model

Each skill is one JSON document in a Cosmos **container**:

```json
{
  "id": "tradeoff-analysis-agent",
  "name": "Tradeoff Analysis Agent",
  "description": "...",
  "body": "...",
  "created_by": null
}
```

Structure inside the account:

```
Account (the-lore-erkuyghur)
  └── Database (e.g. "lore")
        └── Container "skills"  ← one document per skill
```

`created_by` is included now (nullable) so migrated skills are valid and we can
start stamping it once accounts land. No schema/migrations to design — documents
match the shape we already pass around in code.

## 6. Requirements

- Azure Cosmos DB for NoSQL account on the **M365 Core Design** subscription,
  **Serverless** capacity (pay-per-use), Availability Zones disabled.
- A database and a `skills` container inside the account.
- Backend reads the Cosmos **endpoint + key** from config that is **never
  committed to git** (it's a secret).
- `azure-cosmos` Python package added to the backend dependencies.
- `load_skills()` rewritten to read all documents from Cosmos.
- `save_skill(skill)` rewritten to write one document to Cosmos. Keep the
  existing `_safe_id` kebab-case validation and the no-overwrite guarantee.
- One-time **seed/migration script** that reads every `data/skills/*.md` and
  writes it into Cosmos.
- Matching/search and AI drafting behavior must be unchanged after the swap.

### Known tradeoff: Azure lock-in

Cosmos is an Azure-specific service. We're choosing it because it's the option
the team can provision today and a document store fits our data cleanly. If we
ever needed to leave Azure, the sealed storage layer keeps the blast radius to
those same two functions.

## 7. Open questions

- **Subscription access:** waiting on Contributor access to **M365 Core Design**
  so the account can be created. → with mentor.
- **Cosmos API flavor:** assuming **NoSQL / Core**. → confirm with mentor.
- **Local development:** use the Cosmos DB Emulator vs. developing against the
  real cloud account. → decide once the account exists.
- **Secret handling:** confirm the pattern for keeping endpoint + key out of git
  (e.g. `.env` + gitignore, or Azure Key Vault later).

## 8. Milestones (build order)

- **M1:** Create the Cosmos DB account (account shell only). → blocked on
  subscription access.
- **M2:** Create the database + `skills` container inside it.
- **M3:** Pull endpoint + key into non-committed config; install `azure-cosmos`;
  prove the backend can connect.
- **M4:** Seed/migration script: existing `.md` files → Cosmos (one-time pass).
- **M5:** Rewrite the insides of `load_skills` and `save_skill` to use Cosmos.
- **M6:** Verify end-to-end — add a skill via the UI, restart the backend, and
  confirm it's still there and still searchable.
- **M7:** Add `created_by` stamping (deferred until accounts; column exists now).
