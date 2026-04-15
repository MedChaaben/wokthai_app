import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { PRIVACY_LAST_UPDATED, PRIVACY_SECTIONS } from '../legal/privacy-fr';
import { wt } from '../lib/theme';

export default function PrivacyScreen() {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.updated}>Dernière mise à jour : {PRIVACY_LAST_UPDATED}</Text>
      <Text style={styles.intro}>
        Cette politique décrit comment Wokthai traite les données personnelles lorsque vous utilisez l’application.
        Elle complète les conditions générales d’utilisation. Vous pouvez la consulter à tout moment depuis le menu
        Compte ou l’écran de connexion.
      </Text>
      {PRIVACY_SECTIONS.map((section) => (
        <View key={section.title} style={styles.block}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.paragraphs.map((p, i) => (
            <Text key={i} style={styles.paragraph}>
              {p}
            </Text>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: wt.bg },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 0,
  },
  updated: {
    fontSize: 12,
    color: wt.textSecondary,
    marginBottom: 12,
    fontWeight: '600',
  },
  intro: {
    fontSize: 14,
    color: wt.textMuted,
    lineHeight: 21,
    marginBottom: 20,
  },
  block: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: wt.text,
    marginBottom: 10,
  },
  paragraph: {
    fontSize: 14,
    color: wt.textMuted,
    lineHeight: 22,
    marginBottom: 10,
  },
});
