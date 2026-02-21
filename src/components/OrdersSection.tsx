import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Icon from "@/components/ui/icon";
import { ClientOption, OrderRecord, GET_REGISTRATIONS_URL } from "./orders/types";
import OzonOrderForm from "./orders/OzonOrderForm";
import RegularOrderForm from "./orders/RegularOrderForm";
import OrdersTable from "./orders/OrdersTable";

interface Props {
  onNavigateToClient?: (clientId: number) => void;
}

const OrdersSection = ({ onNavigateToClient }: Props) => {
  const [mode, setMode] = useState("ozon");
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  const loadOrders = useCallback(() => {
    setOrdersLoading(true);
    fetch(`${GET_REGISTRATIONS_URL}?action=orders`)
      .then((r) => r.json())
      .then((data) => setOrders(data.orders || []))
      .catch(() => {})
      .finally(() => setOrdersLoading(false));
  }, []);

  useEffect(() => {
    fetch(GET_REGISTRATIONS_URL)
      .then((r) => r.json())
      .then((data) => setClients(data.clients || []))
      .catch(() => {});
    loadOrders();
  }, [loadOrders]);

  const handleOrderCreated = (order: OrderRecord) => {
    setOrders((prev) => [order, ...prev]);
  };

  const handleOrderUpdated = (updated: OrderRecord) => {
    setOrders((prev) => prev.map((o) => o.id === updated.id ? { ...o, ...updated } : o));
  };

  return (
    <div className="space-y-6">
      <Card className="border-orange-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Icon name="ShoppingCart" size={20} className="text-orange-500" />
            Оформить заказ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={mode} onValueChange={setMode}>
            <TabsList className="mb-4">
              <TabsTrigger value="ozon" className="flex items-center gap-1.5">
                <Icon name="Package" size={14} />
                Заказ Ozon
              </TabsTrigger>
              <TabsTrigger value="regular" className="flex items-center gap-1.5">
                <Icon name="User" size={14} />
                По данным клиента
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ozon" className="space-y-5">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm flex items-start gap-2">
                <Icon name="Info" size={16} className="text-amber-600 mt-0.5 shrink-0" />
                <span>
                  Введите номер заказа Ozon (например,{" "}
                  <span className="font-mono font-semibold">12345678-0001</span>).
                  Клиент самостоятельно зарегистрируется по этому номеру и данные объединятся.
                </span>
              </div>
              <OzonOrderForm onOrderCreated={handleOrderCreated} />
            </TabsContent>

            <TabsContent value="regular" className="space-y-5">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm flex items-start gap-2">
                <Icon name="Info" size={16} className="text-blue-600 mt-0.5 shrink-0" />
                <span>
                  Оформите заказ для клиента из магазина, мессенджеров или других каналов — где данные клиента известны напрямую.
                </span>
              </div>
              <RegularOrderForm
                clients={clients}
                onClientAdded={(client) => setClients((prev) => [...prev, client])}
                onOrderCreated={handleOrderCreated}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Tabs value={mode} onValueChange={setMode}>
        <TabsList className="mb-4">
          <TabsTrigger value="ozon" className="flex items-center gap-1.5">
            <Icon name="Package" size={14} />
            Заказы Ozon
          </TabsTrigger>
          <TabsTrigger value="regular" className="flex items-center gap-1.5">
            <Icon name="Store" size={14} />
            Прочие заказы
          </TabsTrigger>
        </TabsList>
        <TabsContent value="ozon">
          <OrdersTable orders={orders} loading={ordersLoading} ozonOnly={true} onNavigateToClient={onNavigateToClient} onOrderUpdated={handleOrderUpdated} />
        </TabsContent>
        <TabsContent value="regular">
          <OrdersTable orders={orders} loading={ordersLoading} ozonOnly={false} onNavigateToClient={onNavigateToClient} onOrderUpdated={handleOrderUpdated} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OrdersSection;