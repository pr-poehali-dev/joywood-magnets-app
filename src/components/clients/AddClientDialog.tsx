import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Icon from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { usePhoneInput } from "@/hooks/usePhoneInput";
import { CHANNELS } from "@/lib/store";
import { toast } from "sonner";
import { ADD_CLIENT_URL, Registration } from "./types";

interface AddClientDialogProps {
  onClientAdded: (client: Registration) => void;
}

const AddClientDialog = ({ onClientAdded }: AddClientDialogProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addMode, setAddMode] = useState<string>("ozon");
  const [newName, setNewName] = useState("");
  const [newChannel, setNewChannel] = useState("");
  const [newOzonCode, setNewOzonCode] = useState("");
  const [saving, setSaving] = useState(false);

  const phone = usePhoneInput();

  const isOzonOnly = addMode === "ozon";
  const isFormValid = isOzonOnly
    ? newOzonCode.trim().length >= 3
    : newName.trim().length >= 2 && phone.isValid && newChannel;

  const resetForm = () => { setNewName(""); phone.reset(); setNewChannel(""); setNewOzonCode(""); };

  const handleAdd = async () => {
    if (!isFormValid) return;
    setSaving(true);
    try {
      const body = isOzonOnly
        ? { ozon_order_code: newOzonCode.trim() }
        : { name: newName.trim(), phone: phone.fullPhone, channel: newChannel, ozon_order_code: newChannel === "Ozon" ? newOzonCode.trim() || null : null };
      const res = await fetch(ADD_CLIENT_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка");
      toast.success(`${isOzonOnly ? `Заказ ${newOzonCode.trim()}` : newName.trim()} — добавлен`);
      resetForm();
      setDialogOpen(false);
      onClientAdded({
        id: data.id,
        name: isOzonOnly ? "" : newName.trim(),
        phone: isOzonOnly ? "" : newPhone.trim(),
        channel: isOzonOnly ? "Ozon" : newChannel,
        ozon_order_code: newOzonCode.trim() || null,
        created_at: data.created_at,
        registered: data.registered,
        total_amount: 0,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Не удалось добавить клиента");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5"><Icon name="UserPlus" size={16} />Добавить клиента</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Новый клиент</DialogTitle></DialogHeader>
        <Tabs value={addMode} onValueChange={(v) => { setAddMode(v); resetForm(); }} className="pt-2">
          <TabsList className="w-full">
            <TabsTrigger value="ozon" className="flex-1">Только код Ozon</TabsTrigger>
            <TabsTrigger value="full" className="flex-1">Полные данные</TabsTrigger>
          </TabsList>
          <TabsContent value="ozon" className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Код заказа Ozon</Label>
              <Input placeholder="Например: 12345678-0001" value={newOzonCode} onChange={(e) => setNewOzonCode(e.target.value)} />
              <p className="text-xs text-muted-foreground">Клиент привяжет заказ при регистрации — записи объединятся</p>
            </div>
            <Button className="w-full" disabled={!isFormValid || saving} onClick={handleAdd}>
              {saving ? <span className="flex items-center gap-2"><Icon name="Loader2" size={16} className="animate-spin" />Сохранение...</span> : "Добавить по коду Ozon"}
            </Button>
          </TabsContent>
          <TabsContent value="full" className="space-y-4 pt-2">
            <div className="space-y-2"><Label>Имя</Label><Input placeholder="Имя клиента" value={newName} onChange={(e) => setNewName(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Телефон</Label>
              <PhoneInput id="add-client-phone" phoneHook={phone} />
              <p className="text-xs text-muted-foreground">По этому номеру клиент увидит свои магниты на /my-collection</p>
            </div>
            <div className="space-y-2">
              <Label>Канал</Label>
              <Select value={newChannel} onValueChange={setNewChannel}>
                <SelectTrigger><SelectValue placeholder="Откуда пришёл клиент" /></SelectTrigger>
                <SelectContent>{CHANNELS.map((ch) => (<SelectItem key={ch} value={ch}>{ch}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            {newChannel === "Ozon" && (
              <div className="space-y-2"><Label>Код заказа Ozon</Label><Input placeholder="Например: 12345678-0001" value={newOzonCode} onChange={(e) => setNewOzonCode(e.target.value)} /></div>
            )}
            <Button className="w-full" disabled={!isFormValid || saving} onClick={handleAdd}>
              {saving ? <span className="flex items-center gap-2"><Icon name="Loader2" size={16} className="animate-spin" />Сохранение...</span> : "Добавить клиента"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AddClientDialog;