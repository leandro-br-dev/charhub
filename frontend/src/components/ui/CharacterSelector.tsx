import { useState, useRef, useEffect, useCallback, Fragment } from "react";
import { useTranslation } from "react-i18next";
import { Combobox, Transition } from "@headlessui/react";
import { Avatar } from "./Avatar";
import type { Character, CharacterSummary } from "../../types/characters";

export interface CharacterOption {
  value: string;
  label: string;
  avatar?: string | null;
  gender?: string | null;
  isFavorite?: boolean;
}

export interface CharacterSelectorProps {
  characters: Array<Character | CharacterSummary | CharacterOption>;
  selectedId?: string;
  onSelect: (character: Character | CharacterSummary | CharacterOption | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  searchable?: boolean;
  loading?: boolean;
  enableFilters?: boolean;
}

type GenderFilter = "all" | "male" | "female" | "non-binary" | "other";

/**
 * CharacterSelector - A reusable dropdown component for selecting characters
 *
 * Features:
 * - Displays avatar + name side by side
 * - Search/filter functionality
 * - Gender filter
 * - Favorites filter
 * - Character count display
 * - Single selection mode
 * - Visual feedback for hover and selection
 * - Accessible keyboard navigation
 *
 * @example
 * ```tsx
 * <CharacterSelector
 *   characters={characterList}
 *   selectedId={selectedCharacterId}
 *   onSelect={(character) => setSelectedCharacterId(character?.id || null)}
 *   placeholder="Select a character..."
 *   enableFilters={true}
 * />
 * ```
 */
export const CharacterSelector = ({
  characters,
  selectedId,
  onSelect,
  placeholder,
  disabled = false,
  className = "",
  searchable = true,
  loading = false,
  enableFilters = false,
}: CharacterSelectorProps) => {
  const { t } = useTranslation("chat");
  const [query, setQuery] = useState("");
  const [optionsStyle, setOptionsStyle] = useState({});
  const [genderFilter, setGenderFilter] = useState<GenderFilter>("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const comboboxRef = useRef<HTMLDivElement>(null);

  const resolvedPlaceholder =
    placeholder ?? t("characterSelector.searchPlaceholder", "Search characters by name...");

  const calculatePosition = useCallback(() => {
    requestAnimationFrame(() => {
      if (comboboxRef.current) {
        const rect = comboboxRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const dropdownHeightEstimate = 400; // Taller for filters
        const openUpwards =
          spaceBelow < dropdownHeightEstimate && rect.top > spaceBelow;

        setOptionsStyle({
          position: "absolute",
          width: "100%",
          ...(openUpwards
            ? { bottom: "calc(100% + 4px)" }
            : { top: "calc(100% + 4px)" }),
        });
      }
    });
  }, []);

  // Normalize character data to CharacterOption format
  const normalizedOptions: CharacterOption[] = characters.map((char) => {
    if ("value" in char && "label" in char) {
      return char as CharacterOption;
    }
    const firstName = (char as Character | CharacterSummary).firstName;
    const lastName = (char as Character | CharacterSummary).lastName;
    const label = lastName ? `${firstName} ${lastName}` : firstName;

    // Get avatar from images array if available, otherwise use avatar field
    const charWithImages = char as Character;
    const avatar = charWithImages.images?.[0]?.url ||
                   (char as Character | CharacterSummary).avatar ||
                   null;

    return {
      value: (char as Character | CharacterSummary).id,
      label,
      avatar,
      gender: (char as Character | CharacterSummary).gender || null,
      isFavorite: (char as any).isFavorite || false,
    };
  });

  // Filter options based on search query, gender, and favorites
  const filteredOptions = normalizedOptions.filter((option) => {
    // Search filter
    const matchesSearch =
      query === "" ||
      option.label.toLowerCase().includes(query.toLowerCase());

    // Gender filter
    const matchesGender =
      genderFilter === "all" ||
      option.gender?.toLowerCase() === genderFilter;

    // Favorites filter
    const matchesFavorites = !favoritesOnly || option.isFavorite;

    return matchesSearch && matchesGender && matchesFavorites;
  });

  // Get character counts for display
  const totalCount = normalizedOptions.length;
  const filteredCount = filteredOptions.length;

  // Get selected character - ensure it's never undefined (use null instead)
  const selectedCharacter = normalizedOptions.find(
    (opt) => opt.value === selectedId
  ) ?? null;

  const handleChange = (selectedOption: CharacterOption | null) => {
    if (!selectedOption) {
      onSelect(null);
      return;
    }

    // Find the original character object to pass back
    const originalCharacter = characters.find(
      (char) =>
        (char as Character | CharacterSummary).id === selectedOption.value ||
        ("value" in char && char.value === selectedOption.value)
    );

    onSelect(originalCharacter || null);
  };

  const handleClearFilters = useCallback(() => {
    setGenderFilter("all");
    setFavoritesOnly(false);
    setQuery("");
  }, []);

  const wrapperBaseClasses = "relative w-full";
  const inputBaseClasses =
    "w-full rounded-lg pl-3 pr-10 py-2.5 text-sm shadow-sm border focus:ring-2 focus:outline-none";
  const buttonBaseClasses =
    "absolute inset-y-0 right-0 flex items-center px-2 cursor-pointer";
  const optionsBaseClasses =
    "absolute z-50 mt-1 w-full max-h-96 overflow-auto rounded-lg border border-border bg-light dark:bg-gray-800 py-1 text-sm shadow-lg";
  const optionBaseClasses = "cursor-pointer select-none px-3 py-2";

  const variants = {
    input:
      "bg-light dark:bg-gray-700 text-content border-border focus:border-primary focus:ring-primary",
    button: "text-muted hover:text-content",
    option: {
      active: "bg-primary/10 dark:bg-primary/20 text-primary",
      inactive: "text-content",
      selected: "bg-primary/20 dark:bg-primary/30 text-primary font-medium",
    },
  };

  return (
    <div className={`${wrapperBaseClasses} ${className}`.trim()}>
      <Combobox value={selectedCharacter} onChange={handleChange} disabled={disabled}>
        {({ open }) => {
          useEffect(() => {
            if (open) {
              calculatePosition();
              window.addEventListener("resize", calculatePosition);
              window.addEventListener("scroll", calculatePosition, true);
            }
            return () => {
              window.removeEventListener("resize", calculatePosition);
              window.removeEventListener("scroll", calculatePosition, true);
            };
          }, [open, calculatePosition]);

          return (
            <div className="relative" ref={comboboxRef}>
              <Combobox.Input
                className={`${inputBaseClasses} ${variants.input}`}
                onChange={(event) => {
                  if (searchable) {
                    setQuery(event.target.value);
                  }
                }}
                placeholder={resolvedPlaceholder}
                displayValue={(option: CharacterOption) => option?.label || ""}
                readOnly={!searchable}
              />
              <Combobox.Button className={`${buttonBaseClasses} ${variants.button}`}>
                <span className="material-symbols-outlined text-base">
                  unfold_more
                </span>
              </Combobox.Button>

              <Transition
                as={Fragment}
                show={open}
                leave="transition ease-in duration-100"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
                afterLeave={() => {
                  setQuery("");
                  if (!enableFilters) {
                    setGenderFilter("all");
                    setFavoritesOnly(false);
                  }
                }}
              >
                <Combobox.Options
                  static
                  className={optionsBaseClasses}
                  style={optionsStyle}
                >
                  {/* Filters Section */}
                  {enableFilters && (
                    <div className="px-3 py-2 border-b border-border dark:border-gray-600">
                      {/* Gender Filter */}
                      <div className="mb-2">
                        <label className="text-xs text-muted mb-1 block">
                          {t("characterSelector.filterByGender")}
                        </label>
                        <div className="flex flex-wrap gap-1">
                          {[
                            { value: "all" as GenderFilter, label: t("characterSelector.allGenders") },
                            { value: "male" as GenderFilter, label: t("characterSelector.genderMale") },
                            { value: "female" as GenderFilter, label: t("characterSelector.genderFemale") },
                            { value: "non-binary" as GenderFilter, label: t("characterSelector.genderNonBinary") },
                            { value: "other" as GenderFilter, label: t("characterSelector.genderOther") },
                          ].map((gender) => (
                            <button
                              key={gender.value}
                              type="button"
                              onClick={() => setGenderFilter(gender.value)}
                              className={`px-2 py-1 text-xs rounded transition-colors ${
                                genderFilter === gender.value
                                  ? "bg-primary text-white"
                                  : "bg-gray-200 dark:bg-gray-600 text-content hover:bg-gray-300 dark:hover:bg-gray-500"
                              }`}
                            >
                              {gender.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Favorites Filter */}
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setFavoritesOnly(!favoritesOnly)}
                          className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${
                            favoritesOnly
                              ? "bg-yellow-500 text-white"
                              : "bg-gray-200 dark:bg-gray-600 text-content hover:bg-gray-300 dark:hover:bg-gray-500"
                          }`}
                        >
                          <span className="material-symbols-outlined text-sm">
                            {favoritesOnly ? "star" : "star_border"}
                          </span>
                          {t("characterSelector.filterByFavorites")}
                        </button>

                        {/* Clear Filters */}
                        {(genderFilter !== "all" || favoritesOnly) && (
                          <button
                            type="button"
                            onClick={handleClearFilters}
                            className="text-xs text-primary hover:underline"
                          >
                            {t("characterSelector.clearFilters")}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Character Count */}
                  {!loading && totalCount > 0 && (
                    <div className="px-3 py-1 text-xs text-muted border-b border-border dark:border-gray-600">
                      {filteredCount === totalCount
                        ? t("characterSelector.showingCount", {
                            count: filteredCount,
                            total: totalCount,
                          })
                        : `${filteredCount} / ${totalCount}`}
                    </div>
                  )}

                  {loading && (
                    <div className="px-3 py-4 text-center text-muted">
                      <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
                      <p className="text-xs mt-2">{t("characterSelector.loadingCharacters")}</p>
                    </div>
                  )}

                  {!loading && filteredOptions.length === 0 && query !== "" && (
                    <div className="px-3 py-2 text-muted text-center">
                      {t("characterSelector.noCharactersFound")}
                    </div>
                  )}

                  {!loading && filteredOptions.length === 0 && query === "" && (genderFilter !== "all" || favoritesOnly) && (
                    <div className="px-3 py-2 text-muted text-center">
                      {t("characterSelector.noCharactersMatchFilters")}
                    </div>
                  )}

                  {!loading && filteredOptions.length === 0 && query === "" && genderFilter === "all" && !favoritesOnly && (
                    <div className="px-3 py-2 text-muted text-center">
                      {t("characterSelector.noCharactersAvailable")}
                    </div>
                  )}

                  {!loading &&
                    filteredOptions.map((option) => {
                      const isSelected = option.value === selectedId;
                      return (
                        <Combobox.Option
                          key={option.value}
                          value={option}
                          className={({ active }) =>
                            `${optionBaseClasses} flex items-center gap-3 ${
                              active
                                ? variants.option.active
                                : isSelected
                                ? variants.option.selected
                                : variants.option.inactive
                            }`
                          }
                        >
                          <Avatar
                            src={option.avatar || undefined}
                            alt={option.label}
                            size="small"
                            className="flex-shrink-0"
                          />
                          <span className="flex-grow text-left truncate">
                            {option.label}
                          </span>
                          {option.isFavorite && (
                            <span
                              className="material-symbols-outlined text-sm text-yellow-500"
                              title={t("characterSelector.favoriteTooltip")}
                            >
                              star
                            </span>
                          )}
                          {isSelected && (
                            <span className="material-symbols-outlined text-sm text-primary">
                              check
                            </span>
                          )}
                        </Combobox.Option>
                      );
                    })}
                </Combobox.Options>
              </Transition>
            </div>
          );
        }}
      </Combobox>
    </div>
  );
};

export default CharacterSelector;
