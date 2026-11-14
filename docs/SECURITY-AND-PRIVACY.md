# My Company Book — Security and Canadian Privacy Checklist

This is an engineering checklist, not legal advice or a claim of compliance.

## Before accepting real customer data

- Identify applicable privacy laws by customer location, business activity and data flows (including PIPEDA and applicable provincial laws such as BC PIPA, Alberta PIPA and Quebec's private-sector privacy law).
- Obtain legal review of privacy notices, consent/notice flows, service terms, retention, access/correction and deletion processes.
- Complete privacy impact / transfer assessments where required, including Quebec requirements for transfers outside Quebec.
- Document all subprocessors, processing locations, backups, telemetry, support access and cross-border transfers.
- Execute appropriate data-processing and confidentiality agreements with providers.

## Technical controls

- TLS for all network traffic.
- Encryption at rest for databases, object storage and backups.
- Strong password handling delegated to a reputable identity provider; offer MFA.
- Secure account recovery and session revocation.
- Server-side authorization on every company record and document operation.
- Tenant isolation tests proving Company A cannot read or alter Company B data.
- Least-privilege staff access, audited administrative access and no routine access to customer documents.
- Secrets held only in server-side secret management.
- Rate limiting, input validation, dependency updates and security logging.
- Tested backups, restore drills, retention controls and documented incident response.
- Export and account-closure process that preserves customer access for the applicable retention period and handles deletion lawfully.

## Canadian data-location requirement

Product target: primary customer database, document storage and backups in Canada. Do not describe this as “all data stays in Canada” until vendor contracts and all service flows (including logs, support, telemetry, edge execution and subprocessors) have been verified. Region selection alone is not proof of legal compliance.

## Accounting record integrity

- Preserve original uploaded documents.
- Keep an audit history for important accounting changes.
- Do not silently rewrite or discard posted financial records.
- Support complete export and tested restoration.
- Design retention and accessibility around applicable CRA and provincial requirements; confirm exact rules with qualified Canadian accounting/legal advice.
