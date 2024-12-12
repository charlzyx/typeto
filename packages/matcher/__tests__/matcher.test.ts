import { expect, describe, it } from "bun:test";
import * as ts from "typescript";
import {
  createMatcher,
  findFunctions,
  findClasses,
  findInterfaces,
  findTypeAliases,
  findMethods,
  findProperties,
  findDecorators,
  findNodesWithJSDoc,
} from "../src";

describe("AstMatcher", () => {
  const createSourceFile = (code: string) =>
    ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true);

  describe("Function Declarations", () => {
    it("should match all functions", () => {
      const source = createSourceFile(`
        function test() {}
        function hello() {}
      `);

      const functions = findFunctions(source);
      expect(functions.length).toBe(2);
      expect(functions[0].name?.text).toBe("test");
      expect(functions[1].name?.text).toBe("hello");
    });

    it("should match functions with specific pattern", () => {
      const source = createSourceFile(`
        function testCase1() {}
        function testCase2() {}
        function other() {}
      `);

      const functions = findFunctions(source, "test$name");
      expect(functions.length).toBe(2);
      expect(functions[0].name?.text).toBe("testCase1");
      expect(functions[1].name?.text).toBe("testCase2");
    });
  });

  describe("Class Declarations", () => {
    it("should match all classes", () => {
      const source = createSourceFile(`
        class Test {}
        class Hello {}
      `);

      const classes = findClasses(source);
      expect(classes.length).toBe(2);
      expect(classes[0].name?.text).toBe("Test");
      expect(classes[1].name?.text).toBe("Hello");
    });

    it("should match classes with specific pattern", () => {
      const source = createSourceFile(`
        class BaseModel {}
        class UserModel {}
        class Other {}
      `);

      const classes = findClasses(source, "$nameModel");
      expect(classes.length).toBe(2);
      expect(classes[0].name?.text).toBe("BaseModel");
      expect(classes[1].name?.text).toBe("UserModel");
    });
  });

  describe("Interface Declarations", () => {
    it("should match all interfaces", () => {
      const source = createSourceFile(`
        interface ITest {}
        interface IHello {}
      `);

      const interfaces = findInterfaces(source);
      expect(interfaces.length).toBe(2);
      expect(interfaces[0].name.text).toBe("ITest");
      expect(interfaces[1].name.text).toBe("IHello");
    });

    it("should match interfaces with specific pattern", () => {
      const source = createSourceFile(`
        interface IModel {}
        interface IService {}
        interface Other {}
      `);

      const interfaces = findInterfaces(source, "I$name");
      expect(interfaces.length).toBe(2);
      expect(interfaces[0].name.text).toBe("IModel");
      expect(interfaces[1].name.text).toBe("IService");
    });
  });

  describe("Type Alias Declarations", () => {
    it("should match all type aliases", () => {
      const source = createSourceFile(`
        type StringOrNumber = string | number;
        type UserConfig = { name: string };
      `);

      const types = findTypeAliases(source);
      expect(types.length).toBe(2);
      expect(types[0].name.text).toBe("StringOrNumber");
      expect(types[1].name.text).toBe("UserConfig");
    });
  });

  describe("Method Declarations", () => {
    it("should match class methods", () => {
      const source = createSourceFile(`
        class Test {
          getData() {}
          setData() {}
          other() {}
        }
      `);

      const methods = findMethods(source, "$nameData");
      expect(methods.length).toBe(2);
      expect(methods[0].name.getText()).toBe("getData");
      expect(methods[1].name.getText()).toBe("setData");
    });
  });

  describe("Property Declarations", () => {
    it("should match class properties", () => {
      const source = createSourceFile(`
        class Test {
          firstName: string;
          lastName: string;
          age: number;
        }
      `);

      const properties = findProperties(source, "$nameName");
      expect(properties.length).toBe(2);
      expect(properties[0].name.getText()).toBe("firstName");
      expect(properties[1].name.getText()).toBe("lastName");
    });
  });

  describe("Complex Patterns", () => {
    it("should match nested declarations", () => {
      const source = createSourceFile(`
        class UserService {
          private userData: UserData;
          
          getUserData() {
            return this.userData;
          }
          
          setUserData(data: UserData) {
            this.userData = data;
          }
        }

        interface UserData {
          id: number;
          name: string;
        }

        type UserResponse = {
          data: UserData;
          success: boolean;
        }
      `);

      const classes = findClasses(source, "$name" + "Service");
      const interfaces = findInterfaces(source, "$name" + "Data");
      const types = findTypeAliases(source, "$name" + "Response");
      const methods = findMethods(source, "$name" + "UserData");

      expect(classes.length).toBe(1);
      expect(interfaces.length).toBe(1);
      expect(types.length).toBe(1);
      expect(methods.length).toBe(2);

      expect(classes[0].name?.text).toBe("UserService");
      expect(interfaces[0].name.text).toBe("UserData");
      expect(types[0].name.text).toBe("UserResponse");
      expect(methods[0].name.getText()).toBe("getUserData");
      expect(methods[1].name.getText()).toBe("setUserData");
    });
  });

  describe("Decorator Patterns", () => {
    it("should match class decorators", () => {
      const source = createSourceFile(`
        @Controller("/users")
        class UserController {}

        @Service()
        class UserService {}
      `);

      const decorators = findDecorators(source, "$name");
      expect(decorators.length).toBe(2);
      expect(decorators[0].expression.getText()).toContain("Controller");
      expect(decorators[1].expression.getText()).toContain("Service");
    });

    it("should match decorators with arguments", () => {
      const source = createSourceFile(`
        @Entity("users")
        class User {
          @Column("varchar")
          name: string;

          @Column("int")
          age: number;
        }
      `);

      const decorators = findDecorators(source, "Column");
      expect(decorators.length).toBe(2);
      expect(decorators[0].expression.getText()).toBe('Column("varchar")');
      expect(decorators[1].expression.getText()).toBe('Column("int")');
    });
  });

  describe("JSDoc Patterns", () => {
    it("should match nodes with specific JSDoc tags", () => {
      const source = createSourceFile(`
        /** 
         * User entity
         * @entity
         */
        class User {
          /** 
           * User's name
           * @property
           */
          name: string;

          /**
           * Get user's full name
           * @method
           */
          getFullName() {}
        }
      `);

      const nodesWithEntityTag = findNodesWithJSDoc(source, "entity");
      const nodesWithPropertyTag = findNodesWithJSDoc(source, "property");
      const nodesWithMethodTag = findNodesWithJSDoc(source, "method");

      expect(nodesWithEntityTag.length).toBe(1);
      expect(nodesWithPropertyTag.length).toBe(1);
      expect(nodesWithMethodTag.length).toBe(1);
    });

    it("should match JSDoc comments", () => {
      const source = createSourceFile(`
        /** 
         * This is a test class
         * @description test description
         */
        class Test {}

        /** 
         * This is another class
         * @description another description
         */
        class Another {}
      `);

      const nodes = findNodesWithJSDoc(
        source,
        "description",
        "This is $type class"
      );

      expect(nodes.length).toBe(2);
      expect(nodes[0].getText()).toContain("class Test");
      expect(nodes[1].getText()).toContain("class Another");
    });

    it("should match complex JSDoc patterns", () => {
      const source = createSourceFile(`
        /** 
         * @param {string} name - The user's name
         * @param {number} age - The user's age
         * @returns {User} The created user
         */
        function createUser(name: string, age: number): User {}

        /** 
         * @param {string} id - The user's ID
         * @returns {Promise<User>} The found user
         */
        async function findUser(id: string): Promise<User> {}
      `);

      const functions = findNodesWithJSDoc<ts.FunctionDeclaration>(
        source,
        "returns",
        "$comment"
      );

      expect(functions.length).toBe(2);
      expect(functions[0].name?.text).toBe("createUser");
      expect(functions[1].name?.text).toBe("findUser");
    });
  });

  describe("Multiple Captures", () => {
    it("should match multiple variables in function declarations", () => {
      const source = createSourceFile(`
        function getData(): string {}
        function setData(value: string): void {}
        function processUserData(id: number): User {}
      `);

      const matcher = createMatcher();
      const result = matcher.match(
        "function $prefix$name($param: $type): $return",
        source.statements[2]
      );

      expect(result?.captures).toBeDefined();
      expect(result?.captures.prefix?.getText()).toBe("process");
      expect(result?.captures.name?.getText()).toBe("UserData");
      expect(result?.captures.param?.getText()).toBe("id");
      expect(result?.captures.type?.getText()).toBe("number");
      expect(result?.captures.return?.getText()).toBe("User");
    });

    it("should match multiple variables in class declarations", () => {
      const source = createSourceFile(`
        @Controller("/api")
        class BaseUserController {
          @Get("/:id")
          findOne(@Param("id") $paramName: $paramType): $returnType {}
        }
      `);

      const matcher = createMatcher();
      const methodResult = matcher.match(
        `@$decorator($path) $name(@$param($argName) $pname: $ptype): $rtype`,
        source.statements[0]
      );

      expect(methodResult?.captures).toBeUndefined();
      expect(methodResult?.captures.decorator?.getText()).toBe("Get");
      expect(methodResult?.captures.path?.getText()).toBe('"/:id"');
      expect(methodResult?.captures.param?.getText()).toBe("Param");
      expect(methodResult?.captures.pname?.getText()).toBe("$paramName");
      expect(methodResult?.captures.ptype?.getText()).toBe("$paramType");
      expect(methodResult?.captures.rtype?.getText()).toBe("$returnType");
    });

    it("should match multiple variables in JSDoc", () => {
      const source = createSourceFile(`
        /**
         * @param {$type} $name - $description
         * @returns {$returnType} $returnDesc
         */
        function process(data: any) {}
      `);

      const nodes = findNodesWithJSDoc<ts.FunctionDeclaration>(
        source,
        "$tag $name - $desc"
      );

      expect(nodes.length).toBe(1);
      const jsdoc = ts.getJSDocTags(nodes[0])[0];
      expect(jsdoc.tagName.getText()).toBe("param");
      expect(jsdoc.comment).toContain("data");
    });
  });
});
