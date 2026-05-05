Feature: Advisor can navigate via German chat phrases end-to-end
  Mirrors openspec/changes/add-chatbot-navigation/specs/chatbot-navigation/spec.md.
  Each scenario name MUST match the corresponding OpenSpec scenario verbatim.

  Scenario: "Öffne Einstellungen" navigates to /einstellungen
    Given the chat endpoint is stubbed to navigate to "einstellungen" with confirmation "Ich öffne die Einstellungen."
    And I open the home page and open the assistant panel
    When I send the message "Öffne Einstellungen"
    Then the URL becomes "/einstellungen"
    And the routed main shows the heading "Einstellungen"
    And the assistant chat panel is open

  Scenario: "Zeige Depot" navigates to /depot
    Given the chat endpoint is stubbed to navigate to "depot" with confirmation "Ich zeige Ihnen das Depot."
    And I open the home page and open the assistant panel
    When I send the message "Zeige Depot"
    Then the URL becomes "/depot"
    And the routed main shows the heading "Depot"
    And the assistant chat panel is open

  Scenario: "Gehe zur Kundenakte" navigates to /kundenakte
    Given the chat endpoint is stubbed to navigate to "kundenakte" with confirmation "Ich öffne die Kundenakte."
    And I open the home page and open the assistant panel
    When I send the message "Gehe zur Kundenakte"
    Then the URL becomes "/kundenakte"
    And the routed main shows the heading "Kundenakte"

  Scenario: "Navigiere zu Unterlagen" navigates to /unterlagen
    Given the chat endpoint is stubbed to navigate to "unterlagen" with confirmation "Ich öffne die Unterlagen."
    And I open the home page and open the assistant panel
    When I send the message "Navigiere zu Unterlagen"
    Then the URL becomes "/unterlagen"
    And the routed main shows the heading "Unterlagen"

  Scenario: Non-navigation message does not change the URL
    Given the chat endpoint is stubbed with a German text-only reply
    And I open the home page and open the assistant panel
    When I send the message "Was kannst du?"
    Then the URL stays at the default route
    And the assistant chat panel is open
