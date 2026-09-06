import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown, Search, X, Check, AlertCircle } from 'lucide-react-native';
import { colors } from '../../constants/colors';

export function Select({
  label,
  value,
  onSelect,
  options = [], // [{ id, label, subtitle, icon, group }]
  placeholder = 'Sélectionner...',
  searchPlaceholder = 'Rechercher...',
  error,
  hint,
  disabled = false,
  containerStyle,
  icon: Icon,
  enableSearch = true,
  modalTitle,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const insets = useSafeAreaInsets();

  const selectedOption = useMemo(() => {
    return options.find((opt) => opt.id === value);
  }, [options, value]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase().trim();
    return options.filter((opt) => {
      const labelMatch = (opt.label || '').toLowerCase().includes(q);
      const subMatch = (opt.subtitle || '').toLowerCase().includes(q);
      const groupMatch = (opt.group || '').toLowerCase().includes(q);
      return labelMatch || subMatch || groupMatch;
    });
  }, [options, searchQuery]);

  function handleOpen() {
    if (disabled) return;
    setSearchQuery('');
    setIsOpen(true);
  }

  function handleSelect(item) {
    onSelect(item.id);
    setIsOpen(false);
    setSearchQuery('');
  }

  const borderColor = error ? colors.danger : isOpen ? colors.primary : colors.border;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[styles.label, error && styles.labelError]}>{label}</Text>}

      {/* Trigger Button */}
      <TouchableOpacity
        style={[
          styles.trigger,
          { borderColor },
          isOpen && styles.triggerFocused,
          disabled && styles.triggerDisabled,
        ]}
        onPress={handleOpen}
        activeOpacity={0.75}
        disabled={disabled}
      >
        <View style={styles.triggerContent}>
          {Icon && (
            <Icon
              size={18}
              color={selectedOption ? colors.primary : colors.textMuted}
              style={styles.leadingIcon}
            />
          )}
          {selectedOption ? (
            <View style={styles.selectedWrap}>
              <Text style={styles.selectedText} numberOfLines={1}>
                {selectedOption.label}
              </Text>
              {selectedOption.subtitle && (
                <Text style={styles.selectedSubtitle} numberOfLines={1}>
                  {selectedOption.subtitle}
                </Text>
              )}
            </View>
          ) : (
            <Text style={styles.placeholderText} numberOfLines={1}>
              {placeholder}
            </Text>
          )}
        </View>

        <ChevronDown
          size={18}
          color={isOpen ? colors.primary : colors.textMuted}
          style={[styles.chevron, isOpen && styles.chevronRotated]}
        />
      </TouchableOpacity>

      {/* Error & Hint footer */}
      {error ? (
        <View style={styles.errorRow}>
          <AlertCircle size={13} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}

      {/* Select Modal */}
      <Modal
        visible={isOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={() => setIsOpen(false)}>
            <View style={styles.backdrop} />
          </TouchableWithoutFeedback>

          <View style={[styles.sheetContainer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            {/* Sheet Handle */}
            <View style={styles.handle} />

            {/* Sheet Header */}
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{modalTitle || label || placeholder}</Text>
              <TouchableOpacity
                onPress={() => setIsOpen(false)}
                style={styles.closeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color={colors.navy} />
              </TouchableOpacity>
            </View>

            {/* Search Box */}
            {enableSearch && options.length > 5 && (
              <View style={styles.searchWrap}>
                <Search size={17} color={colors.textMuted} />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder={searchPlaceholder}
                  placeholderTextColor={colors.textDisabled}
                  style={styles.searchInput}
                  autoCorrect={false}
                  clearButtonMode="while-editing"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <X size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* List of Options */}
            <FlatList
              data={filteredOptions}
              keyExtractor={(item) => String(item.id)}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const isSelected = item.id === value;
                return (
                  <TouchableOpacity
                    style={[styles.optionItem, isSelected && styles.optionItemSelected]}
                    onPress={() => handleSelect(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.optionInfo}>
                      <Text
                        style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}
                        numberOfLines={1}
                      >
                        {item.label}
                      </Text>
                      {item.subtitle && (
                        <Text style={styles.optionSub} numberOfLines={1}>
                          {item.subtitle}
                        </Text>
                      )}
                    </View>

                    {isSelected && (
                      <View style={styles.checkBadge}>
                        <Check size={14} color={colors.white} strokeWidth={2.5} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyText}>Aucune option trouvée</Text>
                </View>
              }
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  labelError: {
    color: colors.danger,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  triggerFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryBg,
  },
  triggerDisabled: {
    backgroundColor: colors.surface,
    opacity: 0.6,
  },
  triggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  leadingIcon: {
    marginRight: 10,
  },
  selectedWrap: {
    flex: 1,
  },
  selectedText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.navy,
  },
  selectedSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  placeholderText: {
    fontSize: 15,
    color: colors.textDisabled,
  },
  chevron: {
    marginLeft: 6,
  },
  chevronRotated: {
    transform: [{ rotate: '180deg' }],
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
  },
  hint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },

  /* Modal bottom sheet styles */
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 22, 44, 0.45)',
  },
  sheetContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.navy,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    paddingVertical: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  optionItemSelected: {
    backgroundColor: colors.primaryBg,
    borderColor: colors.primary,
  },
  optionInfo: {
    flex: 1,
    marginRight: 10,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  optionLabelSelected: {
    fontWeight: '700',
    color: colors.navy,
  },
  optionSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  checkBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyWrap: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
  },
});
