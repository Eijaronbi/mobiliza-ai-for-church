import { z } from "zod";

export const vehicleRegistrationSchema = z.object({
  label: z.string().trim().min(1, "Enter a bus name"),
  plate: z.string().trim().min(1, "Enter a registration plate").transform((value) => value.toUpperCase()),
  capacity: z.number().int("Enter a whole number of seats").positive("Enter a positive seating capacity"),
  driverName: z.string().trim().min(1, "Enter the driver's name"),
  driverPhone: z.string().trim().regex(/^\+?[\d\s()-]{7,20}$/, "Enter a valid driver phone number"),
});

export type VehicleRegistration = z.infer<typeof vehicleRegistrationSchema>;

export function normalizePlate(plate: string) {
  return plate.toUpperCase().replace(/[^A-Z0-9]/g, "");
}