Feature: Advisor can load customer files via chat or directly via the Kundenakte route

  Scenario: Empty Kundenakte route shows the picker and guidance
    Given I open the home page
    When I navigate to "/kundenakte"
    Then the routed main shows the heading "Kundenakte"
    And the routed main contains "Wählen Sie oben einen Kunden aus"
    And the routed main shows a picker entry for "Anna Müller"
    And the routed main shows a picker entry for "Bernd Schmidt"

  Scenario: Picking a customer in the UI loads the detail
    Given I open the home page
    When I navigate to "/kundenakte"
    And I pick the customer "Anna Müller" from the picker
    Then the routed main contains "Anna Müller"
    And the routed main contains "185.400 €"

  Scenario: Picking a customer marks the next chat turn with loadCustomer=true
    Given the chat endpoint records the request payload
    And I open the home page
    When I navigate to "/kundenakte"
    And I pick the customer "Anna Müller" from the picker
    And I open the assistant panel
    And I send the message "Was steht in den Notizen?"
    Then the recorded chat request had currentCustomerId "c-001"
    And the recorded chat request had loadCustomer true

  Scenario: Agent reply lists the advisor's customers
    Given the chat endpoint is stubbed with a German list of fake customers
    And I open the home page and open the assistant panel
    When I send the message "Welche Kunden habe ich?"
    Then the assistant reply mentions "Müller"
    And the assistant reply mentions "Schmidt"

  Scenario: Agent loads a customer into the Kundenakte page
    Given the chat endpoint is stubbed to load customer "c-001" with name "Anna Müller"
    And I open the home page
    When I navigate to "/kundenakte"
    And I open the assistant panel
    And I send the message "Öffne Kunde Müller"
    Then the routed main shows the heading "Kundenakte"
    And the routed main contains "Anna Müller"
    And the routed main contains "185.400 €"
