// deno-lint-ignore-file no-explicit-any
import * as dntShim from "../_dnt.test_shims.js";
"use strict";
import { describe, it } from "../deps/deno.land/x/deno_mocha@0.3.0/mod.js";
import { X12Parser, X12Transaction, X12TransactionMap, } from "../mod.js";
import * as assert from "assert";
const edi = dntShim.Deno.readTextFileSync("test/test-data/850.edi");
const edi855 = dntShim.Deno.readTextFileSync("test/test-data/855.edi");
const mapJson = dntShim.Deno.readTextFileSync("test/test-data/850_map.json");
const resultJson = dntShim.Deno.readTextFileSync("test/test-data/850_map_result.json");
const transactionJson = dntShim.Deno.readTextFileSync("test/test-data/Transaction_map.json");
const transactionJsonLiquid = dntShim.Deno.readTextFileSync("test/test-data/Transaction_map_liquidjs.json");
const transactionData = dntShim.Deno.readTextFileSync("test/test-data/Transaction_data.json");
describe("X12Mapping", () => {
    it("should map transaction to data", () => {
        const parser = new X12Parser();
        const interchange = parser.parse(edi);
        const transaction = interchange.functionalGroups[0].transactions[0];
        const mapper = new X12TransactionMap(JSON.parse(mapJson), transaction);
        assert.deepStrictEqual(mapper.toObject(), JSON.parse(resultJson));
    });
    it("should map data to transaction with custom macro", () => {
        const transaction = new X12Transaction();
        const mapper = new X12TransactionMap(JSON.parse(transactionJson), transaction);
        const data = JSON.parse(transactionData);
        const result = mapper.fromObject(data, {
            toFixed: function toFixed(key, places) {
                return {
                    val: parseFloat(key).toFixed(places),
                };
            },
        });
        if (!(result instanceof X12Transaction)) {
            throw new Error("An error occured when mapping an object to a transaction.");
        }
    });
    it("should map data to transaction with LiquidJS", () => {
        const transaction = new X12Transaction();
        const mapper = new X12TransactionMap(JSON.parse(transactionJsonLiquid), transaction, "liquidjs");
        const data = JSON.parse(transactionData);
        const result = mapper.fromObject(data, {
            to_fixed: (value, places) => parseFloat(value).toFixed(places),
        });
        if (!(result instanceof X12Transaction)) {
            throw new Error("An error occured when mapping an object to a transaction.");
        }
    });
    it("should map empty data when element missing from qualified segment", () => {
        // Addresses issue https://github.com/ahuggins-nhs/node-x12/issues/23
        const mapObject = { author: 'FOREACH(PO1)=>PO109:PO103["UN"]' };
        const parser = new X12Parser();
        const interchange = parser.parse(edi855);
        const transaction = interchange.functionalGroups[0].transactions[0];
        const mapperLoose = new X12TransactionMap(mapObject, transaction, "loose");
        const mapperStrict = new X12TransactionMap(mapObject, transaction, "strict");
        const resultLoose = mapperLoose.toObject();
        const resultStrict = mapperStrict.toObject();
        assert.strictEqual(Array.isArray(resultLoose), true);
        assert.strictEqual(Array.isArray(resultStrict), true);
        assert.strictEqual(resultLoose.length, 4);
        assert.strictEqual(resultStrict.length, 3);
        assert.deepStrictEqual(resultLoose[2], { author: "" });
        assert.deepStrictEqual(resultStrict[2], { author: "NOT APPLICABLE" });
    });
    it("should generate LQ segments from nested arrays using repeatFor with LiquidJS", () => {
        const transaction = new X12Transaction();
        const adjustmentMap = {
            header: ["835", "{{ macro | random }}"],
            segments: [
                {
                    tag: "CAS",
                    elements: [
                        "{{ input.adjustments | map: 'groupCode' | in_loop }}",
                        "{{ input.adjustments | map: 'reasonCode' | in_loop }}",
                        "{{ input.adjustments | map: 'amount' | in_loop }}",
                    ],
                    loopStart: true,
                    loopLength: "{{ input.adjustments | size }}",
                },
                {
                    tag: "LQ",
                    elements: [
                        "RX",
                        "{{ input.adjustments | map: 'remarks' | in_loop }}",
                    ],
                    repeatFor: "{{ input.adjustments | map: 'remarks' | in_loop }}",
                },
                {
                    loopEnd: true,
                },
            ],
        };
        const mapper = new X12TransactionMap(adjustmentMap, transaction, "liquidjs");
        const inputData = {
            adjustments: [
                {
                    groupCode: "PI",
                    reasonCode: "16",
                    amount: 120,
                    remarks: ["N1", "N77"],
                },
            ],
        };
        const result = mapper.fromObject(inputData);
        assert.strictEqual(result instanceof X12Transaction, true);
        assert.strictEqual(result.segments.length, 3); // CAS + 2 LQ segments
        // Check CAS segment
        const casSegment = result.segments[0];
        assert.strictEqual(casSegment.tag, "CAS");
        assert.strictEqual(casSegment.elements[0].value, "PI");
        assert.strictEqual(casSegment.elements[1].value, "16");
        assert.strictEqual(casSegment.elements[2].value, "120");
        // Check first LQ segment
        const lq1Segment = result.segments[1];
        assert.strictEqual(lq1Segment.tag, "LQ");
        assert.strictEqual(lq1Segment.elements[0].value, "RX");
        assert.strictEqual(lq1Segment.elements[1].value, "N1");
        // Check second LQ segment
        const lq2Segment = result.segments[2];
        assert.strictEqual(lq2Segment.tag, "LQ");
        assert.strictEqual(lq2Segment.elements[0].value, "RX");
        assert.strictEqual(lq2Segment.elements[1].value, "N77");
    });
});
