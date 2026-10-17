---
name: Customer public wallet configuration
description: Customer public addresses are not Super Admin RPC monitoring configurations.
---
Customers may manage isolated public wallet addresses in their Exchange Admin Panel. RPC infrastructure, blockchain nodes, monitoring configuration and master credentials remain Super Admin only. Saving an address never authorizes deposits, custody, withdrawals or execution.

**Why:** The user explicitly included Wallet addresses in customer administration while reserving infrastructure and monitoring for Super Admin. Treating every public address as infrastructure incorrectly removed a requested customer capability.

**How to apply:** Separate public-address records from monitoring records on backend reads and writes, not just navigation. Preserve central monitoring settings during customer saves and prohibit customer records from acquiring monitoring through a generic enable toggle.
