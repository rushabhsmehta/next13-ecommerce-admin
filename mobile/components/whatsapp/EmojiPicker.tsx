import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Modal,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants/theme";

const EMOJI_CATEGORIES: Record<string, string[]> = {
  "😊": ["😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂", "😉", "😍", "🤩", "😘", "😗", "😚", "😙", "🥲", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "😐", "😑", "😶", "🙄", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "😈", "👿", "💀"],
  "👍": ["👋", "🤚", "🖐", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "🫶", "👐", "🤲", "🙏", "✍️", "💪", "🦾", "🦿", "🦵", "🦶", "👂", "🦻", "👃"],
  "❤️": ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "☮️", "✝️", "☪️", "🕉", "☸️", "✡️", "🔯", "🕎", "☯️", "⭐", "🌟", "💫", "✨", "🌈", "🎉", "🎊", "🎈", "🎁", "🎀", "🎗️"],
  "🌍": ["🌍", "🌎", "🌏", "🌐", "🗺", "🧭", "🏔", "⛰", "🌋", "🗻", "🏕", "🏖", "🏜", "🏝", "🏞", "🏟", "🏛", "🏗", "🧱", "🏘", "🏚", "🏠", "🏡", "🏢", "🏣", "🏤", "🏥", "🏦", "🏨", "🏩", "🏪", "🏫", "🏬", "🏭", "🏯", "🏰", "💒", "🗼", "🗽"],
  "🚀": ["🚀", "🛸", "🛺", "🚗", "🚕", "🚙", "🚌", "🚎", "🏎", "🚓", "🚑", "🚒", "🚐", "🛻", "🚚", "🚛", "🚜", "🏍", "🛵", "🚲", "🛴", "🛹", "🛼", "🚏", "🛣", "🛤", "⛽", "🚧", "⚓", "🛥", "🚢", "✈️", "🛩", "🛫", "🛬", "🪂", "🚁", "🚟", "🚠"],
  "🍕": ["🍕", "🍔", "🌮", "🌯", "🥙", "🧆", "🥚", "🍳", "🥘", "🍲", "🍛", "🍜", "🍝", "🍠", "🍢", "🍣", "🍤", "🍙", "🍚", "🍱", "🥟", "🦪", "🍦", "🍧", "🍨", "🍩", "🍪", "🎂", "🍰", "🧁", "🥧", "🍫", "🍬", "🍭", "🍮", "🍯", "🍼", "🥤", "🧋"],
};

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
}

export function EmojiPicker({ visible, onClose, onSelect }: Props) {
  const [activeCategory, setActiveCategory] = useState("😊");
  const [search, setSearch] = useState("");

  const categoryKeys = Object.keys(EMOJI_CATEGORIES);
  const emojis = search.trim()
    ? Object.values(EMOJI_CATEGORIES).flat().filter((e) => e.includes(search))
    : EMOJI_CATEGORIES[activeCategory] ?? [];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.container}>
        {/* Search */}
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={14} color={Colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search emoji…"
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={Colors.textTertiary}
          />
        </View>

        {/* Category tabs */}
        {!search && (
          <View style={styles.categoryRow}>
            {categoryKeys.map((cat) => (
              <Pressable
                key={cat}
                style={[styles.catBtn, activeCategory === cat && styles.catBtnActive]}
                onPress={() => setActiveCategory(cat)}
              >
                <Text style={styles.catEmoji}>{cat}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Emoji grid */}
        <FlatList
          data={emojis}
          keyExtractor={(item, i) => `${item}-${i}`}
          numColumns={8}
          renderItem={({ item }) => (
            <Pressable
              style={styles.emojiBtn}
              onPress={() => {
                onSelect(item);
                onClose();
              }}
            >
              <Text style={styles.emoji}>{item}</Text>
            </Pressable>
          )}
          contentContainerStyle={styles.grid}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  container: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: 320,
    paddingTop: Spacing.md,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  categoryRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    gap: 4,
    marginBottom: Spacing.sm,
  },
  catBtn: {
    padding: 6,
    borderRadius: BorderRadius.sm,
  },
  catBtnActive: {
    backgroundColor: Colors.primaryBg,
  },
  catEmoji: { fontSize: 20 },
  grid: {
    paddingHorizontal: Spacing.sm,
    paddingBottom: 20,
  },
  emojiBtn: {
    flex: 1,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    maxWidth: "12.5%",
  },
  emoji: { fontSize: 24 },
});
