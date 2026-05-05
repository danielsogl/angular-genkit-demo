# current-user Specification

## Purpose

TBD - created by archiving change add-dashboard-ui. Update Purpose after archive.

## Requirements

### Requirement: Current user is exposed as a signal

The application SHALL provide a `CurrentUserService` registered with `providedIn: 'root'` that exposes the currently signed-in user as a read-only `Signal<User | null>`. Consumers SHALL read the value through the signal API; no `Subject`, `Observable`, or `Promise`-based access SHALL be added in this change.

#### Scenario: Service is a singleton

- **WHEN** `CurrentUserService` is injected from two different components
- **THEN** both components observe the same signal instance and the same user value

#### Scenario: Signal is read-only to consumers

- **WHEN** a consumer accesses the user from the service
- **THEN** the consumer cannot reassign the signal or mutate the underlying user object via the service's public API

### Requirement: User type defines display fields

The application SHALL define a `User` type with at least the following fields: `id` (string), `name` (string), `email` (string), and `initials` (string). The type SHALL be exported from a single module so the shell and future features import the same definition.

#### Scenario: Required fields are present on the mock user

- **WHEN** `CurrentUserService.user()` returns a non-null user
- **THEN** the returned object has non-empty `id`, `name`, `email`, and `initials` fields

### Requirement: Mock user is provided for now

For this change, the service SHALL return a hard-coded mock user. The service SHALL be implemented so a future real implementation can replace the mock without changing consumer code.

#### Scenario: Mock user is returned on first read

- **WHEN** the application starts and any component reads `CurrentUserService.user()`
- **THEN** the signal returns a non-null mock user with deterministic field values

#### Scenario: Implementation is replaceable in place

- **WHEN** the mock implementation is later swapped for a real one
- **THEN** consumers that only depend on the `Signal<User | null>` API continue to compile and run without modification
