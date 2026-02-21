import Icon from "@/components/ui/icon";

interface Props {
  clientName: string;
  orderAmount: number;
}

const MagnetPickerHeader = ({ clientName, orderAmount }: Props) => (
  <div className="bg-orange-500 rounded-t-xl px-5 py-4 flex items-center gap-3">
    <div className="bg-white/20 rounded-full p-2">
      <Icon name="Gift" size={20} className="text-white" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-bold text-white text-base">Выдача магнитов</p>
      <p className="text-orange-100 text-xs truncate">{clientName} — необходимо принять решение</p>
    </div>
    {orderAmount > 0 && (
      <div className="text-right shrink-0">
        <p className="text-orange-100 text-xs">Заказ</p>
        <p className="text-white font-bold text-sm">{orderAmount.toLocaleString("ru-RU")} ₽</p>
      </div>
    )}
  </div>
);

export default MagnetPickerHeader;
