# Account assistant connections

Apply the forward-only tower assistants migration before deploying the web application. No new provider, service credential, or dependency is required. Connect from Account, import the OpenAPI definition into a compatible client and configure Bearer authentication. List Towers, read a Tower revision, and submit one optional measurement with a unique request ID. A retry returns the same receipt. A conflicting edit requires a fresh read. Test with a synthetic account and verify revocation returns 401.

For rollback, revoke EXECUTE on the use_tower_assistant RPC from anon through a reviewed migration to disable existing keys, then restore the previous web release. A web rollback alone leaves the database RPC reachable.

The OpenAPI definition advertises the configured public origin of the deployment. Import the definition from the environment that issued the key. Assistant reads and writes use `rating` for a 1–5 measurement. Writes also accept the older `scale_1_5` spelling, including retries. The `required` flag still distinguishes required measurements. Selecting **Revoke connection** opens a confirmation. **Cancel** keeps access active, and **Confirm revocation** ends access immediately. These changes require only a web deployment after the original assistant migration.
