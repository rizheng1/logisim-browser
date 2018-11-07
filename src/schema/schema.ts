// To parse this data:
//
//   import { Convert, Circuit } from "./file";
//
//   const circuit = Convert.toCircuit(json);
//
// These functions will throw an error if the JSON doesn't
// match the expected interface, even if the JSON is valid.

export interface CircuitObject {
  connections: Connection[];
  gates: Gate[];
  positions: { [key: string]: Position };
}

export interface Connection {
  connect: Reference[];
}

export interface Reference {
  id: string;
  pins: string[];
}

export interface Gate {
  gateType: GateType;
  id?: string;
  inPins: string[];
  interactive?: boolean;
  interactiveType?: InteractiveType;
  logic?: string;
  outPins: string[];
  pattern?: string;
}

export enum GateType {
  And = "AND",
  Button = "BUTTON",
  Clock = "CLOCK",
  Custom = "CUSTOM",
  Diode = "DIODE",
  Nand = "NAND",
  Nor = "NOR",
  Not = "NOT",
  Or = "OR",
  Split = "SPLIT",
  Switch = "SWITCH",
  Wire = "WIRE",
  Xnor = "XNOR",
  Xor = "XOR",
}

export enum InteractiveType {
  Onoff = "onoff",
  Pulse = "pulse",
}

export interface Position {
  height?: number;
  width?: number;
  x: number;
  y: number;
  z?: number;
}

// Converts JSON strings to/from your types
// and asserts the results of JSON.parse at runtime
export namespace Convert {
  export function toCircuit(json: string): any[] | boolean | number | number | null | CircuitObject | string {
    return cast(JSON.parse(json), u(a("any"), true, 3.14, 0, null, r("CircuitObject"), ""));
  }

  export function circuitToJson(value: any[] | boolean | number | number | null | CircuitObject | string): string {
    return JSON.stringify(uncast(value, u(a("any"), true, 3.14, 0, null, r("CircuitObject"), "")), null, 2);
  }

  function invalidValue(typ: any, val: any): never {
    throw Error(`Invalid value ${JSON.stringify(val)} for type ${JSON.stringify(typ)}`);
  }

  function jsonToJSProps(typ: any): any {
    if (typ.jsonToJS === undefined) {
      var map: any = {};
      typ.props.forEach((p: any) => map[p.json] = { key: p.js, typ: p.typ });
      typ.jsonToJS = map;
    }
    return typ.jsonToJS;
  }

  function jsToJSONProps(typ: any): any {
    if (typ.jsToJSON === undefined) {
      var map: any = {};
      typ.props.forEach((p: any) => map[p.js] = { key: p.json, typ: p.typ });
      typ.jsToJSON = map;
    }
    return typ.jsToJSON;
  }

  function transform(val: any, typ: any, getProps: any): any {
    function transformPrimitive(typ: string, val: any): any {
      if (typeof typ === typeof val) return val;
      return invalidValue(typ, val);
    }

    function transformUnion(typs: any[], val: any): any {
      // val must validate against one typ in typs
      var l = typs.length;
      for (var i = 0; i < l; i++) {
        var typ = typs[i];
        try {
          return transform(val, typ, getProps);
        } catch (_) { }
      }
      return invalidValue(typs, val);
    }

    function transformEnum(cases: string[], val: any): any {
      if (cases.indexOf(val) !== -1) return val;
      return invalidValue(cases, val);
    }

    function transformArray(typ: any, val: any): any {
      // val must be an array with no invalid elements
      if (!Array.isArray(val)) return invalidValue("array", val);
      return val.map(el => transform(el, typ, getProps));
    }

    function transformObject(props: { [k: string]: any }, additional: any, val: any): any {
      if (val === null || typeof val !== "object" || Array.isArray(val)) {
        return invalidValue("object", val);
      }
      var result: any = {};
      Object.getOwnPropertyNames(props).forEach(key => {
        const prop = props[key];
        const v = Object.prototype.hasOwnProperty.call(val, key) ? val[key] : undefined;
        result[prop.key] = transform(v, prop.typ, getProps);
      });
      Object.getOwnPropertyNames(val).forEach(key => {
        if (!Object.prototype.hasOwnProperty.call(props, key)) {
          result[key] = transform(val[key], additional, getProps);
        }
      });
      return result;
    }

    if (typ === "any") return val;
    if (typ === null) {
      if (val === null) return val;
      return invalidValue(typ, val);
    }
    if (typ === false) return invalidValue(typ, val);
    while (typeof typ === "object" && typ.ref !== undefined) {
      typ = typeMap[typ.ref];
    }
    if (Array.isArray(typ)) return transformEnum(typ, val);
    if (typeof typ === "object") {
      return typ.hasOwnProperty("unionMembers") ? transformUnion(typ.unionMembers, val)
        : typ.hasOwnProperty("arrayItems") ? transformArray(typ.arrayItems, val)
          : typ.hasOwnProperty("props") ? transformObject(getProps(typ), typ.additional, val)
            : invalidValue(typ, val);
    }
    return transformPrimitive(typ, val);
  }

  function cast<T>(val: any, typ: any): T {
    return transform(val, typ, jsonToJSProps);
  }

  function uncast<T>(val: T, typ: any): any {
    return transform(val, typ, jsToJSONProps);
  }

  function a(typ: any) {
    return { arrayItems: typ };
  }

  function u(...typs: any[]) {
    return { unionMembers: typs };
  }

  function o(props: any[], additional: any) {
    return { props, additional };
  }

  function m(additional: any) {
    return { props: [], additional };
  }

  function r(name: string) {
    return { ref: name };
  }

  const typeMap: any = {
    "CircuitObject": o([
      { json: "connections", js: "connections", typ: a(r("Connection")) },
      { json: "gates", js: "gates", typ: a(r("Gate")) },
      { json: "positions", js: "positions", typ: m(r("Position")) },
    ], "any"),
    "Connection": o([
      { json: "connect", js: "connect", typ: a(r("Reference")) },
    ], false),
    "Reference": o([
      { json: "id", js: "id", typ: "" },
      { json: "pins", js: "pins", typ: a("") },
    ], false),
    "Gate": o([
      { json: "gateType", js: "gateType", typ: r("GateType") },
      { json: "id", js: "id", typ: u(undefined, "") },
      { json: "inPins", js: "inPins", typ: a("") },
      { json: "interactive", js: "interactive", typ: u(undefined, true) },
      { json: "interactiveType", js: "interactiveType", typ: u(undefined, r("InteractiveType")) },
      { json: "logic", js: "logic", typ: u(undefined, "") },
      { json: "outPins", js: "outPins", typ: a("") },
      { json: "pattern", js: "pattern", typ: u(undefined, "") },
    ], false),
    "Position": o([
      { json: "height", js: "height", typ: u(undefined, 3.14) },
      { json: "width", js: "width", typ: u(undefined, 3.14) },
      { json: "x", js: "x", typ: 3.14 },
      { json: "y", js: "y", typ: 3.14 },
      { json: "z", js: "z", typ: u(undefined, 0) },
    ], false),
    "GateType": [
      "AND",
      "BUTTON",
      "CLOCK",
      "CUSTOM",
      "DIODE",
      "NAND",
      "NOR",
      "NOT",
      "OR",
      "SPLIT",
      "SWITCH",
      "WIRE",
      "XNOR",
      "XOR",
    ],
    "InteractiveType": [
      "onoff",
      "pulse",
    ],
  };
}
