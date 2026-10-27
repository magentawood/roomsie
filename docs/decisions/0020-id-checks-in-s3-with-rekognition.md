# ADR 0020 — ID checks in a private S3 bucket, with a face match by Amazon Rekognition

**Status:** Accepted · **Date:** 2026-10-27 · **Deciders:** n3rxv

## Context

- PD8 sets the v0 route: a person sends a non-Aadhaar government ID and a selfie, and a named reviewer compares them. PD8 chose no vendor in v0.
- A reviewer who compares a selfie with an ID photo gives an opinion that a good forger can deceive (PD8).
- The API runs on AWS in `ap-south-1` (ADR 0009). It already has an AWS IAM user for Amazon SES (ADR 0019), and it signs AWS requests with `aws4fetch`.
- The ID photo and the selfie are the most sensitive files of roomsie. They must be in a private bucket, with signed links only (ADR 0005, PD19).

## Decision

**In one line:** The ID files wait in a private S3 bucket in Mumbai, and Amazon Rekognition gives the reviewer a face-match score as a help.

- **The bucket:** a private S3 bucket in `ap-south-1`. The browser uploads with a signed link, and the reviewer views with a signed link. Each link lasts 5 minutes. A lifecycle rule deletes each file after 7 days.
- **The face match:** when the person sends the check, the API asks Rekognition `CompareFaces` to compare the selfie with the ID photo in the bucket. The score goes to the reviewer. The reviewer approves or rejects, and the score goes at the review.
- **The opt-out:** the AWS account has an AI services opt-out policy for Rekognition, so AWS keeps no image for its own use.
- **One module:** only the ID store module of the API touches the bucket and Rekognition.
- **The keys:** the IAM user of ADR 0019 also gets `s3:PutObject`, `s3:GetObject` and `s3:DeleteObject` on this bucket, and `rekognition:CompareFaces`. The deploy workflow gives the API the bucket name, `roomsie-id-checks`, in `ID_BUCKET`. No new key.
- **The reviewers:** the Firebase UIDs in the CI secret `REVIEWER_UIDS`, as `MODERATOR_UIDS` (T-19).
- **No setup, no checks:** without the bucket name or the keys, the API takes no ID check. Without `REVIEWER_UIDS`, nobody reviews.

## Rationale

- Rekognition reads the two files in the bucket, so no photo goes through our API.
- A score costs approximately $0.001 for each check. It gives the reviewer a second opinion on a forged or borrowed ID.
- The files stay in India, and AWS is already in our path.
- A score is not a decision. A false low score must not reject an honest person, so a person decides each check.
- One IAM user keeps one secret pair, for one AWS account.

## Alternatives rejected

- **No vendor, as PD8 said first.** No cost, but the reviewer has only an opinion.
- **A KYC provider (IDfy, HyperVerge).** A check of the ID itself, but ₹3 to ₹10 for each check, a new vendor and a contract before launch.
- **A private R2 bucket.** One storage vendor, but the API must download the two photos to send them to Rekognition, and R2 does not keep the files in India.
- **An IAM user only for the ID checks.** Less access for each key, but one more secret pair to keep and to rotate.

## Consequences

- A second vendor processes the selfies. PD19 and the privacy text must name AWS.
- The IAM user of the alerts can now read the ID files. A leak of that key is a larger risk, so its rotation matters more.
- Before the first check, the bucket, its lifecycle rule, its CORS rule for the web origin, the IAM policy and the opt-out must exist.

## Revisit when

- v1 brings DigiLocker. It needs no selfie in our bucket.
- The fraud rate of the manual route goes up. Then a check of the ID itself can be worth a KYC provider.

## Sources

- The T-46 grill ([#122](https://github.com/magentawood/roomsie/issues/122)), 2026-10-27
- [PD8](pd-08-verification.md), [PD19](pd-19-retention.md), [ADR 0005](0005-managed-platform-split.md), [ADR 0009](0009-hosting-and-region.md), [ADR 0019](0019-alerts-by-ses-and-fcm.md)
