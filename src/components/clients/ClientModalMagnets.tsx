import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Icon from "@/components/ui/icon";
import { WOOD_BREEDS, STAR_LABELS } from "@/lib/store";
import { ClientMagnet, ClientOrder, starBg } from "./types";

interface Props {
  magnets: ClientMagnet[];
  magnetsLoading: boolean;
  clientOrders: ClientOrder[];
  inventory: Record<string, number>;
  selectedBreed: string;
  breedSearch: string;
  breedOpen: boolean;
  givingMagnet: boolean;
  deletingMagnetId: number | null;
  comment: string;
  savingComment: boolean;
  confirmDelete: boolean;
  deleting: boolean;
  onBreedSelect: (breed: string) => void;
  onBreedSearchChange: (v: string) => void;
  onBreedOpenToggle: () => void;
  onBreedClose: () => void;
  onGiveMagnet: () => void;
  onDeleteMagnet: (magnetId: number, breed: string) => void;
  onCommentChange: (v: string) => void;
  onSaveComment: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
}

const ClientModalMagnets = ({
  magnets,
  magnetsLoading,
  clientOrders,
  inventory,
  selectedBreed,
  breedSearch,
  breedOpen,
  givingMagnet,
  deletingMagnetId,
  comment,
  savingComment,
  confirmDelete,
  deleting,
  onBreedSelect,
  onBreedSearchChange,
  onBreedOpenToggle,
  onBreedClose,
  onGiveMagnet,
  onDeleteMagnet,
  onCommentChange,
  onSaveComment,
  onConfirmDelete,
  onCancelDelete,
  onDelete,
}: Props) => {
  const breedRef = useRef<HTMLDivElement>(null);
  const collectedBreeds = new Set(magnets.map((m) => m.breed));
  const unlinkedMagnets = magnets.filter((m) => !m.order_id);

  const availableBreeds = WOOD_BREEDS
    .filter((b) => !collectedBreeds.has(b.breed))
    .map((b) => ({ ...b, stock: inventory[b.breed] ?? 0 }))
    .sort((a, b) => b.stock - a.stock);

  const filteredBreeds = breedSearch.trim()
    ? availableBreeds.filter((b) => b.breed.toLowerCase().includes(breedSearch.toLowerCase()))
    : availableBreeds;

  return (
    <>
      {/* Коллекция магнитов */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Коллекция магнитов</p>
          <span className="text-xs text-muted-foreground">({magnets.length} шт)</span>
        </div>
        {magnetsLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Icon name="Loader2" size={14} className="animate-spin" />Загрузка...
          </div>
        ) : magnets.length === 0 ? (
          <p className="text-sm text-muted-foreground">Магнитов нет</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {magnets.map((m) => (
              <span key={m.id} className={`inline-flex items-center gap-1 border rounded-full px-2.5 py-1 text-xs font-medium ${starBg[m.stars] ?? ""}`}>
                {m.breed} {STAR_LABELS[m.stars]}
                <button
                  className="ml-0.5 text-red-400 hover:text-red-600 disabled:opacity-50"
                  onClick={() => onDeleteMagnet(m.id, m.breed)}
                  disabled={deletingMagnetId === m.id}
                  title="Удалить магнит"
                >
                  {deletingMagnetId === m.id
                    ? <Icon name="Loader2" size={10} className="animate-spin" />
                    : <Icon name="X" size={10} />}
                </button>
              </span>
            ))}
            {unlinkedMagnets.length > 0 && clientOrders.length > 0 && (
              <span className="text-xs text-muted-foreground italic self-center ml-1">({unlinkedMagnets.length} без заказа)</span>
            )}
          </div>
        )}
      </div>

      {/* Выдать магнит вручную */}
      <div className="space-y-2 border-t pt-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Выдать магнит вручную</p>
        <div className="flex gap-2">
          <div className="relative flex-1" ref={breedRef}>
            <button
              className="w-full flex items-center justify-between gap-2 border rounded-lg px-3 py-2 text-sm bg-white hover:border-orange-300 transition-colors"
              onClick={onBreedOpenToggle}
            >
              <span className={selectedBreed ? "text-foreground" : "text-muted-foreground"}>
                {selectedBreed
                  ? (() => { const b = WOOD_BREEDS.find((b) => b.breed === selectedBreed); return b ? `${b.breed} ${STAR_LABELS[b.stars]}` : selectedBreed; })()
                  : "Выбрать породу..."}
              </span>
              <Icon name="ChevronDown" size={14} className="text-muted-foreground shrink-0" />
            </button>
            {breedOpen && (
              <div className="absolute z-50 top-full mt-1 w-full bg-white border rounded-lg shadow-lg overflow-hidden">
                <div className="p-2 border-b">
                  <Input
                    autoFocus
                    placeholder="Поиск породы..."
                    value={breedSearch}
                    onChange={(e) => onBreedSearchChange(e.target.value)}
                    className="h-7 text-sm"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {filteredBreeds.slice(0, 40).map((b) => (
                    <button
                      key={b.breed}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-orange-50 transition-colors ${b.stock === 0 ? "opacity-40" : ""}`}
                      onClick={() => { onBreedSelect(b.breed); onBreedClose(); onBreedSearchChange(""); }}
                      disabled={b.stock === 0}
                    >
                      <span>{b.breed} {STAR_LABELS[b.stars]}</span>
                      <span className="text-xs text-muted-foreground">{b.stock} шт</span>
                    </button>
                  ))}
                  {filteredBreeds.length === 0 && (
                    <p className="text-sm text-muted-foreground px-3 py-2">Не найдено</p>
                  )}
                </div>
              </div>
            )}
          </div>
          <Button size="sm" disabled={!selectedBreed || givingMagnet} onClick={onGiveMagnet} className="gap-1 shrink-0">
            {givingMagnet ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Gift" size={14} />}
            Выдать
          </Button>
        </div>
      </div>

      {/* Комментарий */}
      <div className="space-y-2 border-t pt-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <Icon name="MessageSquare" size={13} />
          Комментарий
        </p>
        <Textarea
          value={comment}
          onChange={(e) => onCommentChange(e.target.value)}
          placeholder="Заметки по клиенту..."
          className="text-sm resize-none"
          rows={2}
        />
        <Button size="sm" variant="outline" className="gap-1" disabled={savingComment} onClick={onSaveComment}>
          {savingComment ? <Icon name="Loader2" size={13} className="animate-spin" /> : <Icon name="Check" size={13} />}
          Сохранить
        </Button>
      </div>

      {/* Удаление клиента */}
      <div className="border-t pt-4 flex justify-end">
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Удалить клиента?</span>
            <Button size="sm" variant="destructive" disabled={deleting} onClick={onDelete} className="gap-1">
              {deleting ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Trash2" size={14} />}
              Да, удалить
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancelDelete}>Отмена</Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50 gap-1" onClick={onConfirmDelete}>
            <Icon name="Trash2" size={14} />
            Удалить клиента
          </Button>
        )}
      </div>
    </>
  );
};

export default ClientModalMagnets;
