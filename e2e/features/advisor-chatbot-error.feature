Feature: Errors surface as a German message with a retry action
  Mirrors openspec/changes/add-advisor-chatbot/specs/advisor-chatbot/spec.md.

  Scenario: Flow rejection shows German error
    Given the chat endpoint fails on the first request and succeeds on retry
    And I open the home page and open the assistant panel
    When I send the message "Hallo"
    Then a German error message is shown in the transcript
    And a retry button labelled "Erneut versuchen" is visible

  Scenario: Retry re-invokes the flow with the previous message
    Given the chat endpoint fails on the first request and succeeds on retry
    And I open the home page and open the assistant panel
    When I send the message "Hallo"
    And I activate the retry button
    Then the assistant reply grows as chunks arrive
