import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { STAR_LABELS } from "@/lib/store";
import { GivenMagnet, PickedBreed, RecommendedOption } from "./magnetPickerLogic";
import MagnetRecommendations from "./MagnetRecommendations";
import MagnetBreedDropdown from "./MagnetBreedDropdown";
import MagnetNoGiftForm from "./MagnetNoGiftForm";

interface PendingPick {
  breed: string;
  stars: number;
  category: string;
}

interface Props {
  isFirstOrder: boolean;
  isRegistered: boolean;
  alreadyOwnedLoaded: boolean;
  mode: "pick" | "no_magnet";
  giving: boolean;
  given: GivenMagnet[];
  pendingPicks: PendingPick[];
  pendingBreeds: Set<string>;
  givenBreeds: Set<string>;
  alreadyOwned: Set<string>;
  inventory: Record<string, number>;
  recommendedOptions: RecommendedOption[];
  recommendedIndex: number;
  reshuffleKey: number;
  validationWarning: string | null;
  comment: string;
  savingComment: boolean;
  filtered: Array<{ breed: string; stars: number; category: string; stock: number }>;
  search: string;
  dropdownOpen: boolean;
  onSelectPick: (breed: string, stars: number, category: string) => void;
  onSelectAll: (picks: Array<PickedBreed | null>) => void;
  onRemovePending: (breed: string) => void;
  onGive: (breed: string, stars: number, category: string) => void;
  onRemove: (magnetId: number, breed: string) => void;
  onReshuffle: () => void;
  onConfirm: () => void;
  onForceConfirm: () => void;
  onClearWarning: () => void;
  onSetMode: (mode: "pick" | "no_magnet") => void;
  onCommentChange: (v: string) => void;
  onSaveComment: () => void;
  onSearchChange: (v: string) => void;
  onDropdownToggle: () => void;
  onDropdownClose: () => void;
}

const MagnetPickerMagnetsStep = ({
  isFirstOrder,
  isRegistered,
  alreadyOwnedLoaded,
  mode,
  giving,
  given,
  pendingPicks,
  pendingBreeds,
  givenBreeds,
  alreadyOwned,
  inventory,
  recommendedOptions,
  recommendedIndex,
  reshuffleKey,
  validationWarning,
  comment,
  savingComment,
  filtered,
  search,
  dropdownOpen,
  onSelectPick,
  onSelectAll,
  onRemovePending,
  onGive,
  onRemove,
  onReshuffle,
  onConfirm,
  onForceConfirm,
  onClearWarning,
  onSetMode,
  onCommentChange,
  onSaveComment,
  onSearchChange,
  onDropdownToggle,
  onDropdownClose,
}: Props) => {
  if (mode === "no_magnet") {
    return (
      <MagnetNoGiftForm
        comment={comment}
        savingComment={savingComment}
        onCommentChange={onCommentChange}
        onBack={() => onSetMode("pick")}
        onSave={onSaveComment}
      />
    );
  }

  return (
    <>
      {!isRegistered && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
          <Icon name="Info" size={15} className="text-blue-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-blue-800">Клиент не зарегистрирован в акции</p>
            <p className="text-xs text-blue-700 mt-0.5">Магниты выдаются, но бонусы начисляются только после регистрации</p>
          </div>
        </div>
      )}

      {!alreadyOwnedLoaded ? (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
          <Icon name="Loader2" size={16} className="animate-spin" />
          Загружаем коллекцию клиента...
        </div>
      ) : (
        <MagnetRecommendations
          isFirstOrder={isFirstOrder}
          options={recommendedOptions}
          recommendedIndex={recommendedIndex}
          alreadyOwned={alreadyOwned}
          givenBreeds={givenBreeds}
          pendingBreeds={pendingBreeds}
          inventory={inventory}
          given={given}
          giving={giving}
          alreadyOwnedSize={alreadyOwned.size}
          reshuffleKey={reshuffleKey}
          onGive={(pick) => onSelectPick(pick.breed, pick.stars, pick.category)}
          onGiveAll={(picks) => onSelectAll(picks)}
          onReshuffle={onReshuffle}
          onRemove={onRemove}
        />
      )}

      {!isFirstOrder && (
        <MagnetBreedDropdown
          filtered={filtered}
          search={search}
          dropdownOpen={dropdownOpen}
          giving={giving}
          onSearchChange={onSearchChange}
          onToggle={onDropdownToggle}
          onClose={onDropdownClose}
          onSelect={onSelectPick}
        />
      )}

      {validationWarning && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-3">
          <div className="flex items-start gap-2">
            <Icon name="AlertTriangle" size={15} className="text-red-500 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-xs font-semibold text-red-800">Нарушение правил акции</p>
              <p className="text-xs text-red-700">{validationWarning}</p>
              <p className="text-xs text-muted-foreground">Выданные: {given.map((g) => `${g.breed} ${STAR_LABELS[g.stars]}`).join(", ")}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-xs"
              onClick={onClearWarning}
            >
              <Icon name="ArrowLeft" size={13} />
              Вернуться
            </Button>
            <Button
              size="sm"
              className="flex-1 text-xs bg-red-500 hover:bg-red-600"
              onClick={onForceConfirm}
            >
              <Icon name="Check" size={13} />
              Всё равно подтвердить
            </Button>
          </div>
        </div>
      )}

      {pendingPicks.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground font-medium">Выбрано для выдачи:</p>
          <div className="flex flex-wrap gap-1.5">
            {pendingPicks.map((p) => (
              <span
                key={p.breed}
                className="inline-flex items-center gap-1 border rounded-full px-2.5 py-1 text-xs font-medium bg-amber-100 border-amber-300 text-amber-900"
              >
                {p.breed} {STAR_LABELS[p.stars]}
                <button onClick={() => onRemovePending(p.breed)} className="ml-0.5 hover:text-red-500">
                  <Icon name="X" size={10} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2 pt-1">
        <Button
          className="w-full bg-orange-500 hover:bg-orange-600 gap-1.5"
          disabled={giving || (given.length === 0 && pendingPicks.length === 0 && !isFirstOrder && recommendedOptions.length > 0)}
          onClick={onConfirm}
        >
          {giving
            ? <><Icon name="Loader2" size={15} className="animate-spin" />Выдаём...</>
            : <><Icon name="Check" size={15} />
              {isFirstOrder
                ? "Готово (Падук выдан)"
                : given.length + pendingPicks.length > 0
                  ? `Подтвердить и выдать (${given.length + pendingPicks.length} магн.)`
                  : "Готово"}
            </>}
        </Button>
        <button
          className="w-full text-xs text-muted-foreground hover:text-red-500 transition-colors py-1"
          onClick={() => onSetMode("no_magnet")}
        >
          Не выдавать магнит (указать причину)
        </button>
      </div>
    </>
  );
};

export default MagnetPickerMagnetsStep;