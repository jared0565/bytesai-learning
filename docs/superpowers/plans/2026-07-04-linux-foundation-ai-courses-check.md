# Linux Foundation AI Free Courses Check

## Objective
Verify Linux Foundation AI/ML free-course results from the supplied filtered resources URL and prepare a safe batch import file for admin upload.

## Constraints
- Source page is current and must be checked directly.
- Include only course pages that remain available and show free pricing.
- Do not write content directly to production D1.
- Use `prov-linux-foundation`.
- Do not treat the filtered page as a complete provider catalog for archive decisions.

## Steps
1. Confirm Linux Foundation provider ID and existing provider rows in remote D1.
2. Extract the AI/ML free-course result set from the supplied Linux Foundation resources page.
3. Verify each candidate course page for availability, `$0`, self-paced delivery, and level.
4. Exclude broken/inactive course pages from the published import.
5. Create `data/imports/linux-foundation-ai-courses-2026-07-04.json`.
6. Validate the file with the batch import parser and run the existing test suite.

## Risks
- The listing may include stale entries whose course pages are inactive or gone.
- The filtered result is not a complete Linux Foundation provider catalog, so archive-missing is unsafe.
