# Iteration 3 Epic 6 and Epic 7 User Stories (2026-05-05)

## Summary

Iteration 3 does not introduce the original low-connectivity, emergency tracking, or trip intention scope. Instead, it completes and improves the existing Epic 1-Epic 5 product experience, with one new AI-supported route reminder feature and several user experience refinements across the route planning and community reporting flows.

## Epic 6: AI-Assisted Route Safety Reminder

As a novice recreational hiker, I want an AI-generated safety reminder based on my planned route, so that I can quickly understand the main route conditions and risks before deciding whether to go.

### User Story 6.1

As a novice hiker, I want to receive an AI Assistant Reminder after planning a safe route, so that I can understand the route result in beginner-friendly language.

Description

This story covers the AI-generated reminder shown on the Plan Route page after the user selects Plan safe route. The reminder summarises the route using backend-prepared facts, including route distance, estimated duration, difficulty, risk level, go/no-go status, geography profile, nearby risk-zone summary, and up to three key risks.

Priority (MoSCoW): Must Have

Benefits

Helps beginner hikers interpret route-planning output more confidently without reading several separate technical fields.

Acceptance Criteria

1. Given the user has entered a valid start point and destination, when they select Plan safe route and the route result is generated, then the Plan Route page displays an AI Assistant Reminder.
2. Given the AI Assistant Reminder is displayed, when the user reads it, then it describes the planned route using route distance, estimated duration, difficulty, risk level, go/no-go status, geography profile, nearby risk-zone summary, and key risks where available.
3. Given the route has nearby hazards or higher-risk conditions, when the AI Assistant Reminder is generated, then the reminder includes a clear safety-oriented explanation using the supplied key risks and advice.
4. Given the AI reminder service is unavailable or times out, when the route result is displayed, then the user can still view the normal route summary and route explanation without the page being blocked.

### User Story 6.2

As a novice hiker, I want the AI route reminder to be based only on verified route-planning facts, so that I can trust that it does not invent information about the route.

Description

This story defines the data and safety boundary for the AI Assistant Reminder. The backend sends a compact facts object to the AI service, and the AI service prompts Gemini to produce an English route introduction using only the supplied information.

Implementation note

The Gemini request is made by `ai-service/src/routeNarrationService.js` through `POST /models/gemini-2.5-flash-lite:generateContent`, with `buildPrompt(route)` placed in the request body as user text content.

Priority (MoSCoW): Must Have

Benefits

Reduces misleading AI output, protects user privacy, and keeps the AI feature aligned with the safety purpose of the platform.

Acceptance Criteria

1. Given the backend requests an AI route reminder, when it sends route context to the AI service, then the context includes only the prepared route facts: `distanceKm`, `durationMin`, `difficulty`, `riskLevel`, `goNoGo`, `geographyProfile`, `zoneSummary`, and `keyRisks`.
2. Given `keyRisks` are included, when the AI prompt is built, then no more than three key risks are sent and each risk contains only relevant fields such as title, type, severity, distance from route, and advice.
3. Given the AI service calls Gemini, when the request is sent, then the prompt instructs Gemini to use only the supplied data, avoid inventing scenery, facilities, route names, or live conditions, and produce an English response of approximately 80-120 words.
4. Given the frontend displays the AI Assistant Reminder, when a user interacts with the Plan Route page, then no user token, Gemini API key, database content, or full browser state is sent from the browser to Gemini.

## Epic 7: Core Safety Flow Experience Refinement

As a novice recreational hiker, I want the existing route planning, map, and community reporting flows to be easier and safer to use, so that I can complete key safety tasks with less confusion.

### User Story 7.1

As a novice hiker, I want clearer map viewing options on the Plan Route page, so that I can inspect my planned route in the map style that is easiest for me to understand.

Description

This story improves the route planning map experience without changing the route-planning goal. The Plan Route map provides three selectable display modes: Clean, Light, and Trail.

Priority (MoSCoW): Should Have

Benefits

Improves route readability for different users and makes the planned journey easier to inspect before departure.

Acceptance Criteria

1. Given the user is viewing the Plan Route map, when the map loads, then the map displays the available Clean, Light, and Trail modes.
2. Given the user selects Clean, Light, or Trail, when the selection is applied, then the map updates to the selected visual style while keeping the planned route, markers, and risk overlays visible.
3. Given the user changes map mode after generating a route, when the map style changes, then the existing route result is preserved and the user does not need to re-enter the start point or destination.

### User Story 7.2

As a novice hiker, I want simple route action tools in the Route Detail view, so that I can open or share the planned route more easily.

Description

This story improves the Route Detail Panel by adding practical route actions that support real-world use after planning.

Priority (MoSCoW): Should Have

Benefits

Makes the route result more actionable and supports safer pre-trip communication.

Acceptance Criteria

1. Given the user opens View Route Detail for a planned route, when the detail panel is displayed, then the user can see an Open in Google Maps action.
2. Given the user selects Open in Google Maps, when the action is triggered, then Google Maps opens with the route or route endpoints where supported.
3. Given the user opens View Route Detail, when the route action tools are displayed, then the user can choose Share route.
4. Given the user selects Share route, when sharing is supported by the device or browser, then the system opens the native share flow or provides an available fallback.

### User Story 7.3

As a hiker submitting a community hazard report, I want to be asked whether the situation is an emergency before submitting, so that urgent situations are directed to emergency services first.

Description

This story refines the Community Report flow. Before a normal report is submitted, the system asks whether the situation is an emergency. If the user chooses Yes, the system starts a call to 000. If the user chooses No, the user continues with the normal report submission process.

Priority (MoSCoW): Must Have

Benefits

Helps users distinguish between community reporting and emergency response, reducing the risk of treating urgent danger as a normal report.

Acceptance Criteria

1. Given the user attempts to submit a community report, when the emergency prompt appears, then the prompt asks whether the situation is an emergency.
2. Given the emergency prompt is displayed, when the user chooses Yes, then the system attempts to call 000 using the device or browser telephone handler.
3. Given the emergency prompt is displayed, when the user chooses No, then the system continues with the normal report submission flow.
4. Given the user continues with normal submission, when the report is submitted successfully, then the report can still appear on the Community Reports map and list using the existing report display behaviour.
