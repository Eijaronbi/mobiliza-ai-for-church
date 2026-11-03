import { beforeEach, describe, expect, it } from "vitest";
import { vehicleRegistrationSchema, normalizePlate } from "@/lib/vehicle-registration";
import { actions } from "@/config/action-map";
import { eventSchemas } from "@/config/event-catalog";
import { mockRepo, resetDemo } from "@/services/data/mock/mock-repository";

const bus = { label: "Church Bus 4", plate: "LAG-123-AB", capacity: 30, driverName: "David Michael", driverPhone: "+2348012345678" };

describe("bus registration", () => {
  beforeEach(() => resetDemo());
  it("registers bus details in the tenant fleet for assignment", async () => {
    const values = vehicleRegistrationSchema.parse(bus);
    const repo = mockRepo("vehicles");
    await repo.create({ ...values, id: "vehicle_registration_test", tenantId: "t_grace", position: { x: 0, y: 0 }, locationPending: true });
    expect((await repo.list("t_grace")).find((v) => v.id === "vehicle_registration_test")).toMatchObject({ ...bus, locationPending: true });
    expect((await repo.list("different_tenant")).some((v) => v.id === "vehicle_registration_test")).toBe(false);
  });
  it("registers a transport workflow event with a vehicle ID", () => {
    expect(actions.registerVehicle.workflow).toBe("transport");
    expect(actions.registerVehicle.event).toBe("vehicle.registered");
    expect(eventSchemas[actions.registerVehicle.event].parse({ vehicle_id: "bus_4" })).toEqual({ vehicle_id: "bus_4" });
    expect(eventSchemas[actions.registerVehicle.event].safeParse({ vehicle_id: "" }).success).toBe(false);
  });
  it("requires a positive whole passenger capacity", () => {
    for (const capacity of [0, -1, 1.5]) expect(vehicleRegistrationSchema.safeParse({ ...bus, capacity }).success).toBe(false);
    expect(vehicleRegistrationSchema.safeParse({ ...bus, capacity: 30 }).success).toBe(true);
  });
  it("compares registration plates regardless of spacing and case", () => {
    expect(normalizePlate("lag 123 ab")).toBe(normalizePlate(bus.plate));
    expect(normalizePlate("LAG-124-AB")).not.toBe(normalizePlate(bus.plate));
  });
});