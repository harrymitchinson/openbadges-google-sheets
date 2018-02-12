import { app, templates } from "./app";

describe("OpenBadges", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  describe("onOpen", () => {
    beforeAll(() => {
      // Arrange
      global.FormApp = {
        getUi: jest.fn().mockReturnThis(),
        createAddonMenu: jest.fn().mockReturnThis(),
        addItem: jest.fn().mockReturnThis(),
        addToUi: jest.fn().mockReturnThis(),
        getActiveForm: jest.fn().mockReturnThis()
      };
      global.ScriptApp = {
        newTrigger: jest.fn().mockReturnThis(),
        forForm: jest.fn().mockReturnThis(),
        onFormSubmit: jest.fn().mockReturnThis(),
        create: jest.fn().mockReturnThis()
      };


      // Act
      app.onOpen();
    });

    it("should provide addon menu", () => {
      // Assert
      expect(FormApp.getUi).toBeCalled();
      expect(FormApp.createAddonMenu).toBeCalled();
      expect(FormApp.addItem).toBeCalledWith(
        "Settings",
        "showConfigurationModal"
      );
      expect(FormApp.getActiveForm).toBeCalled();
    });

    it("should add manual trigger for onFormSubmit", () => {
      // Assert
      expect(ScriptApp.newTrigger).toBeCalledWith("onFormSubmit");
      expect(ScriptApp.forForm).toBeCalled();
      expect(ScriptApp.onFormSubmit).toBeCalled();
      expect(ScriptApp.create).toBeCalled();
    });
  });

  describe("onInstall", () => {
    it("should be alias for onOpen", () => {
      // Arrange
      app.onOpen = jest.fn();

      // Act
      app.onInstall();

      // Assert
      expect(app.onOpen).toBeCalled();
    });
  });

  describe("onSaveConfiguration", () => {
    beforeAll(() => {
      // Arrange
      global.PropertiesService = {
        getUserProperties: jest.fn().mockReturnThis(),
        setProperties: jest.fn()
      };
    });

    it("should access user properties", () => {


      // Act
      app.onSaveConfiguration({});

      // Assert
      expect(PropertiesService.getUserProperties).toBeCalled();
    });

    it("should save properties", () => {
      // Arrange
      const key = "1234567890";
      const config = { apiKey: key };

      // Act
      app.onSaveConfiguration(config);

      // Assert
      expect(PropertiesService.setProperties).toBeCalledWith({
        apiKey: key
      });
    });
  });

  describe("onFormSubmit", () => {
    beforeEach(() => {
      jest.resetAllMocks();
      app.onAuthorizationRequired = jest.fn();

      global.Logger = {
        log: jest.fn()
      };
    });

    describe("when not authorized", () => {
      it("should call onAuthorizationRequired", () => {
        // Arrange
        global.ScriptApp = {
          getAuthorizationInfo: jest.fn().mockReturnThis(),
          getAuthorizationStatus: jest.fn().mockReturnValue("REQUIRED"),
          AuthorizationStatus: {
            REQUIRED: "REQUIRED"
          },
          AuthMode: {
            FULL: "FULL"
          }
        };

        // Act
        app.onFormSubmit();

        // Assert
        expect(app.onAuthorizationRequired).toBeCalled();
      });
    });

    describe("when authorized", () => {
      beforeEach(() => {
        global.ScriptApp = {
          getAuthorizationInfo: jest.fn().mockReturnThis(),
          getAuthorizationStatus: jest.fn().mockReturnValue("NOT_REQUIRED"),
          AuthorizationStatus: {
            REQUIRED: "REQUIRED"
          },
          AuthMode: {
            FULL: "FULL"
          }
        };
      });

      describe("when missing required properties", () => {
        it("should stop processing and log message", () => {
          // Arrange
          const props = { apiUrl: "Value1", NotRequired: "Value2" };
          global.PropertiesService = {
            getUserProperties: jest.fn().mockReturnThis(),
            getProperties: jest.fn().mockReturnValue(props)
          };

          // Act
          const result = app.onFormSubmit();

          // Assert
          expect(result).toBe(false);
          expect(Logger.log).toBeCalled();
        });
      });

      describe("when all required properties exist", () => {
        it("should make request to activity event API", () => {
          // Arrange
          const props = {
            apiUrl: "Value1",
            authToken: "Value2",
            apiKey: "Value3"
          };
          global.PropertiesService = {
            getUserProperties: jest.fn().mockReturnThis(),
            getProperties: jest.fn().mockReturnValue(props)
          };

          global.UrlFetchApp = {
            fetch: jest.fn().mockReturnValue(true)
          };

          // Act
          const result = app.onFormSubmit();

          // Assert
          expect(result).toBe(true);
        });
      });
    });
  });

  describe("onAuthorizationRequired", () => {

    describe("when mail app daily quota is 0", () => {
      it("should log error", () => {
        // Arrange
        global.Logger = {
          log: jest.fn()
        };

        // Act
        app.onAuthorizationRequired();

        // Assert
        expect(Logger.log).toBeCalled();
      });
    });
  });

  describe("showConfigurationModal", () => {
    let template;

    beforeEach(() => {
      // Arrange
      template = {
        evaluate: jest.fn().mockReturnThis(),
        setHeight: jest.fn().mockReturnThis(),
        setWidth: jest.fn().mockReturnThis()
      };

      global.PropertiesService = {
        getUserProperties: jest.fn().mockReturnThis(),
        getProperties: jest.fn().mockReturnValue({})
      };

      global.HtmlService = {
        createTemplate: jest.fn().mockReturnValue(template)
      };

      global.FormApp = {
        getUi: jest.fn().mockReturnThis(),
        showModalDialog: jest.fn()
      };

      // Act
      app.showConfigurationModal();
    });

    it("should use configuration modal template", () => {
      // Assert
      expect(HtmlService.createTemplate).toBeCalledWith(
        templates.configurationModal
      );
    });

    it("should create html output from template", () => {
      // Assert
      expect(template.evaluate).toBeCalled();
      expect(template.setHeight).toBeCalled();
      expect(template.setWidth).toBeCalled();
    });

    it("should show configuration modal", () => {
      // Assert
      expect(FormApp.getUi).toBeCalled();
      expect(FormApp.showModalDialog).toBeCalled();
    });
  });

  describe("hasRequiredProperties", () => {
    describe("when missing provided property names", () => {
      it("should return false", () => {
        const properties = {
          A: "1",
          B: "2"
        };
        const required = ["A", "B", "C"];
        const result = app.hasRequiredProperties(properties, required);
        expect(result).toBe(false);
      });
    });

    describe("when has provided property names", () => {
      it("should return true", () => {
        const properties = {
          A: "1",
          B: "2",
          C: "3"
        };
        const required = ["A", "B", "C"];
        const result = app.hasRequiredProperties(properties, required);
        expect(result).toBe(true);
      });
    });
  });

  describe("bindPropertiesToTemplate", () => {
    const template = {};
    let boundTemplate;
    describe("when properties not set", () => {
      it("should set template bindings as empty strings", () => {
        // Arrange
        global.PropertiesService = {
          getUserProperties: jest.fn().mockReturnThis(),
          getProperties: jest.fn().mockReturnValue({})
        };

        // Act
        boundTemplate = app.bindPropertiesToTemplate(template);

        // Assert
        expect(boundTemplate.apiKey).toBe("");
        expect(boundTemplate.authToken).toBe("");
        expect(boundTemplate.openBadgesUrl).toBe("");
        expect(boundTemplate.activityId).toBe("");
        expect(boundTemplate.activityTime).toBe("");
        expect(boundTemplate.userId).toBe("");
        expect(boundTemplate.text1).toBe("");
        expect(boundTemplate.text2).toBe("");
        expect(boundTemplate.email).toBe("");
        expect(boundTemplate.firstName).toBe("");
        expect(boundTemplate.lastName).toBe("");
        expect(boundTemplate.int1).toBe("");
        expect(boundTemplate.int2).toBe("");
        expect(boundTemplate.date1).toBe("");
      });
    });

    describe("when properties set", () => {
      it("should set template bindings as the property value", () => {
        // Arrange
        const props = {
          apiKey: "Test",
          authToken: "Test",
          apiUrl: "Test",
          activityId: "Test",
          activityTime: "Test",
          userId: "Test",
          text1: "Test",
          text2: "Test",
          firstName: "Test",
          lastName: "Test",
          int1: "Test",
          int2: "Test",
          date1: "Test",
          email: "Test"
        };
        global.PropertiesService = {
          getUserProperties: jest.fn().mockReturnThis(),
          getProperties: jest.fn().mockReturnValue(props)
        };

        // Act
        boundTemplate = app.bindPropertiesToTemplate(template);

        // Assert
        expect(boundTemplate.apiKey).toBe("Test");
        expect(boundTemplate.authToken).toBe("Test");
        expect(boundTemplate.openBadgesUrl).toBe("Test");
        expect(boundTemplate.activityId).toBe("Test");
        expect(boundTemplate.activityTime).toBe("Test");
        expect(boundTemplate.userId).toBe("Test");
        expect(boundTemplate.text1).toBe("Test");
        expect(boundTemplate.text2).toBe("Test");
        expect(boundTemplate.email).toBe("Test");
        expect(boundTemplate.firstName).toBe("Test");
        expect(boundTemplate.lastName).toBe("Test");
        expect(boundTemplate.int1).toBe("Test");
        expect(boundTemplate.int2).toBe("Test");
        expect(boundTemplate.date1).toBe("Test");
      });
    });
  });
});