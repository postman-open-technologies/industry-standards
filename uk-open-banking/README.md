# UK Open Banking

The Open Banking Implementation Entity (catchy title) - the OBIE - is the body responsible for publishing API descriptions for UK banks (ASPSPs in PSD2 terms) to implement.

The API descriptions are grouped into 2 areas:

- Open data: As it sounds, reference data the banks have to make available - ATMs, branches, etc. - all that jazz.
- Read/write: Covers both access to account (Account Information) and the ability to make a payment (Payment Initiation).

OBIE publishes OpenAPI documents, which are in the subdirectories of this directory. Latest versions at time of writing are v2.4.0 for open data and v3.10.0 for read/write.
