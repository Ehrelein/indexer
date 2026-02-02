/// <reference types="vitest/globals" />
import { sum } from "../src/sum.js"

describe("sum", function () {
    test("two integers", function () {
        expect(sum(2, 3)).toBe(5)
    })

    test("floats", function () {
        expect(sum(0.1, 0.2)).toBeCloseTo(0.3)
    })

    test("negative numbers", function () {
        expect(sum(-5, -7)).toBe(-12)
    })

    test("zero", function () {
        expect(sum(0, 0)).toBe(0)
    })

    test("negative zero", function () {
        expect(sum(-0, -0)).toBe(-0)
        expect(1 / sum(-0, -0)).toBe(-Infinity)
    })

    test("bigint conversion", function () {
        expect(sum(BigInt(10), 5)).toBe(15)
    })

    test("bigint negative", function () {
        expect(sum(BigInt(-3), 1)).toBe(-2)
    })

    test("numeric strings", function () {
        expect(sum("4", "6")).toBe(10)
        expect(sum(" 7 ", "8")).toBe(15)
    })

    test("decimal strings", function () {
        expect(sum("1.5", "2.5")).toBe(4)
    })

    test("boolean conversion", function () {
        expect(sum(true, false)).toBe(1)
        expect(sum(true, true)).toBe(2)
        expect(sum(false, false)).toBe(0)
    })

    test("Date conversion", function () {
        const d1 = new Date("2000-01-01T00:00:00Z")
        const d2 = new Date("2000-01-01T00:00:01Z")
        expect(sum(d1, d2)).toBe(d1.getTime() + d2.getTime())
    })

    test("Date and number", function () {
        const d = new Date("2000-01-01T00:00:00Z")
        expect(sum(d, 1000)).toBe(d.getTime() + 1000)
    })

    test("number and string number", function () {
        expect(sum(1, "2")).toBe(3)
        expect(sum("3", 4)).toBe(7)
    })

    test("Number.MAX_VALUE and zero", function () {
        expect(sum(Number.MAX_VALUE, 0)).toBe(Number.MAX_VALUE)
    })

    test("Number.MIN_VALUE and zero", function () {
        expect(sum(Number.MIN_VALUE, 0)).toBe(Number.MIN_VALUE)
    })

    test("NaN throws", function () {
        expect(function () {
            sum(NaN, 1)
        }).toThrow(TypeError)
        expect(function () {
            sum(1, NaN)
        }).toThrow(TypeError)
    })

    test("Infinity throws", function () {
        expect(function () {
            sum(Infinity, 1)
        }).toThrow(TypeError)
        expect(function () {
            sum(1, -Infinity)
        }).toThrow(TypeError)
    })

    test("null throws", function () {
        expect(function () {
            sum(null, 1)
        }).toThrow(TypeError)
        expect(function () {
            sum(1, null)
        }).toThrow(TypeError)
    })

    test("undefined throws", function () {
        expect(function () {
            sum(undefined, 1)
        }).toThrow(TypeError)
        expect(function () {
            sum(1, undefined)
        }).toThrow(TypeError)
    })

    test("empty string throws", function () {
        expect(function () {
            sum("", 1)
        }).toThrow(TypeError)
        expect(function () {
            sum(1, "")
        }).toThrow(TypeError)
    })

    test("whitespace-only string throws", function () {
        expect(function () {
            sum("   ", 1)
        }).toThrow(TypeError)
    })

    test("non-numeric string throws", function () {
        expect(function () {
            sum("abc", 1)
        }).toThrow(TypeError)
        expect(function () {
            sum(1, "xyz")
        }).toThrow(TypeError)
    })

    test("object throws", function () {
        expect(function () {
            sum({ a: 1 }, 2)
        }).toThrow(TypeError)
        expect(function () {
            sum(2, { b: 2 })
        }).toThrow(TypeError)
    })

    test("array throws", function () {
        expect(function () {
            sum([1], 2)
        }).toThrow(TypeError)
        expect(function () {
            sum(2, [3])
        }).toThrow(TypeError)
    })

    test("function throws", function () {
        expect(function () {
            sum(function () {
                return 1
            }, 2)
        }).toThrow(TypeError)
        expect(function () {
            sum(2, function () {
                return 3
            })
        }).toThrow(TypeError)
    })

    test("Symbol throws", function () {
        expect(function () {
            sum(Symbol("x"), 1)
        }).toThrow(TypeError)
        expect(function () {
            sum(1, Symbol("y"))
        }).toThrow(TypeError)
    })
})
