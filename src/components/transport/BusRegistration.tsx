import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Bus, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAction, useListData, useRepoMutations } from "@/hooks/use-data";
import { useApp } from "@/hooks/use-app";
import { normalizePlate, vehicleRegistrationSchema, type VehicleRegistration } from "@/lib/vehicle-registration";

export function BusRegistration({ onRegistered }: { onRegistered: () => void }) {
  const [open, setOpen] = useState(false);
  const { tenantId } = useApp();
  const vehicles = useListData("vehicles");
  const mutations = useRepoMutations("vehicles");
  const run = useAction();
  const form = useForm<VehicleRegistration>({
    resolver: zodResolver(vehicleRegistrationSchema),
    defaultValues: { label: "", plate: "", driverName: "", driverPhone: "" },
  });
  const submit = async (values: VehicleRegistration) => {
    if (vehicles.some((vehicle) => normalizePlate(vehicle.plate) === normalizePlate(values.plate))) {
      form.setError("plate", { message: "This bus is already registered" });
      return;
    }
    try {
      const vehicle = await mutations.create.mutateAsync({
        ...values, id: `veh_${crypto.randomUUID()}`, tenantId,
        position: { x: 0, y: 0 }, locationPending: true,
      });
      await run("registerVehicle", { vehicle_id: vehicle.id }, true);
      toast.success("Bus registered in demo fleet", { description: `${vehicle.label} · ${vehicle.plate}. Demo changes reset on refresh.` });
      setOpen(false);
      form.reset();
      onRegistered();
    } catch {
      toast.error("Bus could not be registered. Please try again.");
    }
  };
  const fields = [
    ["label", "Bus name", "e.g. Church Bus 4"],
    ["plate", "Registration plate", "e.g. LAG-123-AB"],
    ["capacity", "Passenger capacity", "Number of seats"],
    ["driverName", "Driver name", "Full name"],
    ["driverPhone", "Driver phone", "+234…"],
  ] as const;
  return (
    <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) form.reset(); }}>
      <DialogTrigger asChild><Button><Plus className="h-4 w-4" />Register bus</Button></DialogTrigger>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Bus className="h-5 w-5 text-brand" />Register bus</DialogTitle>
          <DialogDescription>Bus and driver details</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map(([key, label, placeholder]) => (
              <div key={key} className={key === "label" ? "space-y-1.5 sm:col-span-2" : "space-y-1.5"}>
                <Label htmlFor={`bus-${key}`}>{label}</Label>
                <Input id={`bus-${key}`} placeholder={placeholder} type={key === "capacity" ? "number" : key === "driverPhone" ? "tel" : "text"} min={key === "capacity" ? 1 : undefined} step={key === "capacity" ? 1 : undefined} aria-invalid={Boolean(form.formState.errors[key])} {...form.register(key, key === "capacity" ? { valueAsNumber: true } : {})} />
                {form.formState.errors[key] && <p role="alert" className="text-xs text-destructive">{form.formState.errors[key]?.message}</p>}
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => { setOpen(false); form.reset(); }} disabled={form.formState.isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bus className="h-4 w-4" />}Register bus</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}