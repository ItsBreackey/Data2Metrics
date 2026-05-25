# Conversion Tracking Setup (GTM + GA4)

This project emits front-end conversion events through:
- `window.dataLayer.push(...)` (for Google Tag Manager)
- `window.gtag('event', ...)` when `gtag` is present (for direct GA4)

Use this map to create GA4 Event tags in GTM and mark key events as conversions.

## Events Emitted

| Event Name | Where It Fires | Parameters |
|---|---|---|
| `book_consultancy_call_click` | Homepage "Book Consultancy Call" CTA | `cta_location` |
| `start_business_report_click` | Business Compass "Start with My Business Report" CTA | `cta_location` |
| `contact_form_start` | First focus in Business Compass contact form | `form_id`, `form_type` |
| `contact_form_submit` | Business Compass contact form submit | `form_id`, `form_type` |
| `whatsapp_continue_click` | Business report "Continue on WhatsApp" click | `source`, `selected_plan` |

## GTM Configuration

1. Open GTM and create a new Trigger for each event:
- Trigger type: Custom Event
- Event name: exact event name from the table above

2. Create one GA4 Event tag per event:
- Tag type: Google Analytics: GA4 Event
- Configuration tag: your GA4 config tag
- Event name: exact event name
- Event parameters: map from Data Layer Variables

3. Create Data Layer Variables for optional parameters:
- `cta_location`
- `form_id`
- `form_type`
- `source`
- `selected_plan`
- `page_path`

4. Publish container.

## Event-by-Event GTM Build Matrix

Use this exact matrix when creating GTM assets.

| Event | Trigger Name | Trigger Type | Tag Name | GA4 Event Name | Parameters to Send |
|---|---|---|---|---|---|
| `book_consultancy_call_click` | `CE | book_consultancy_call_click` | Custom Event (`book_consultancy_call_click`) | `GA4 | Event | book_consultancy_call_click` | `book_consultancy_call_click` | `cta_location`, `page_path` |
| `start_business_report_click` | `CE | start_business_report_click` | Custom Event (`start_business_report_click`) | `GA4 | Event | start_business_report_click` | `start_business_report_click` | `cta_location`, `page_path` |
| `contact_form_start` | `CE | contact_form_start` | Custom Event (`contact_form_start`) | `GA4 | Event | contact_form_start` | `contact_form_start` | `form_id`, `form_type`, `page_path` |
| `contact_form_submit` | `CE | contact_form_submit` | Custom Event (`contact_form_submit`) | `GA4 | Event | contact_form_submit` | `contact_form_submit` | `form_id`, `form_type`, `page_path` |
| `whatsapp_continue_click` | `CE | whatsapp_continue_click` | Custom Event (`whatsapp_continue_click`) | `GA4 | Event | whatsapp_continue_click` | `whatsapp_continue_click` | `source`, `selected_plan`, `page_path` |

### Data Layer Variables to Create

Create these GTM variables (Data Layer Variable type):

| Variable Name | Data Layer Variable Name |
|---|---|
| `DLV | cta_location` | `cta_location` |
| `DLV | form_id` | `form_id` |
| `DLV | form_type` | `form_type` |
| `DLV | source` | `source` |
| `DLV | selected_plan` | `selected_plan` |
| `DLV | page_path` | `page_path` |

### Recommended Conversion Set in GA4

Mark these as conversions:
- `book_consultancy_call_click`
- `start_business_report_click`
- `contact_form_submit`
- `whatsapp_continue_click`

Keep this as diagnostic (non-conversion):
- `contact_form_start`

## GTM Naming Convention

Use consistent names so tags are searchable and maintenance stays simple.

1. Folder naming:
- `D2M | GA4 Events`
- `D2M | Triggers`
- `D2M | Variables`

2. Trigger naming:
- `CE | <event_name>`
- Example: `CE | book_consultancy_call_click`

3. Tag naming:
- `GA4 | Event | <event_name>`
- Example: `GA4 | Event | whatsapp_continue_click`

4. Variable naming:
- `DLV | <param_name>`
- Example: `DLV | selected_plan`

5. Version naming when publishing:
- `D2M Tracking | YYYY-MM-DD | <summary>`
- Example: `D2M Tracking | 2026-05-25 | Added consultancy and WhatsApp events`

## GA4 Conversion Marking

In GA4:
1. Go to Admin -> Events.
2. Wait until events appear (use DebugView to force first hits).
3. Toggle "Mark as conversion" for:
- `book_consultancy_call_click`
- `start_business_report_click`
- `contact_form_submit`
- `whatsapp_continue_click`

(`contact_form_start` is useful for drop-off analysis, usually not a conversion.)

## QA Checklist

1. In GTM Preview mode, click each CTA and confirm event appears in the event stream.
2. In GA4 DebugView, verify event names and parameter payloads.
3. Confirm page context:
- Homepage events include `page_path: /`
- Business Compass events include `page_path: /business_compass`

## Publish Workflow

1. Create or update triggers and tags in a workspace.
2. Run GTM Preview and verify each event end-to-end.
3. Confirm events in GA4 DebugView with expected parameters.
4. Publish GTM container with a descriptive version name.
5. After publish, test once on production in an incognito window.
6. In GA4, verify events are arriving in Realtime.

## Notes

- If GTM is not installed on production pages, `dataLayer` events will not be collected.
- If GA4 `gtag` is not installed, direct `gtag` calls are safely skipped.
- Keep event names stable to preserve reporting continuity.
