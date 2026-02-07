import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { mockLabTests } from '@shared/data/mockData';
import { LabTest, LabStatus } from '@shared/types/medical';

/**
 * Aethea - Lab Results List Screen (Mobile)
 * Professional medical app design with accessibility
 */

// Design tokens
const colors = {
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  success: '#10B981',
  successLight: '#ECFDF5',
  successDark: '#047857',
  warning: '#F59E0B',
  warningLight: '#FFFBEB',
  warningDark: '#B45309',
  error: '#EF4444',
  errorLight: '#FEF2F2',
  errorDark: '#DC2626',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  border: '#E2E8F0',
  neutral: '#94A3B8',
};

export default function LabResultsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const getStatusStyles = (status: LabStatus) => {
    switch (status) {
      case 'normal':
        return { color: colors.successDark, bg: colors.successLight, indicator: colors.success };
      case 'borderline':
        return { color: colors.warningDark, bg: colors.warningLight, indicator: colors.warning };
      case 'abnormal':
      case 'critical':
        return { color: colors.errorDark, bg: colors.errorLight, indicator: colors.error };
      default:
        return { color: colors.neutral, bg: '#F1F5F9', indicator: colors.neutral };
    }
  };

  // Group tests by category
  const groupedTests = mockLabTests.reduce((acc, test) => {
    if (!acc[test.category]) {
      acc[test.category] = [];
    }
    acc[test.category].push(test);
    return acc;
  }, {} as Record<string, LabTest[]>);

  const sections = Object.entries(groupedTests).map(([category, tests]) => ({
    category,
    tests,
  }));

  // Stats
  const normalCount = mockLabTests.filter(t => t.status === 'normal').length;
  const borderlineCount = mockLabTests.filter(t => t.status === 'borderline').length;
  const abnormalCount = mockLabTests.filter(t => t.status === 'abnormal' || t.status === 'critical').length;

  const renderTestCard = ({ item: test }: { item: LabTest }) => {
    const statusStyles = getStatusStyles(test.status);
    
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/(app)/lab-results/${test.id}`)}
        activeOpacity={0.7}
        accessible={true}
        accessibilityLabel={`${test.testName}, ${test.status}, value ${test.value} ${test.unit}`}
        accessibilityHint="Tap to view detailed results"
        accessibilityRole="button"
      >
        {/* Status Indicator */}
        <View style={[styles.statusIndicator, { backgroundColor: statusStyles.indicator }]} />

        <View style={styles.cardContent}>
          {/* Test Name & Date */}
          <View style={styles.cardHeader}>
            <Text style={styles.testName} numberOfLines={1}>
              {test.testName}
            </Text>
            <Text style={styles.date}>
              {test.date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric'
              })}
            </Text>
          </View>

          {/* Value & Status */}
          <View style={styles.resultRow}>
            <View style={styles.valueContainer}>
              <Text style={styles.value}>
                {typeof test.value === 'number' ? test.value.toFixed(1) : test.value}
              </Text>
              <Text style={styles.unit}>{test.unit}</Text>
            </View>

            <View style={[styles.statusBadge, { backgroundColor: statusStyles.bg }]}>
              <Text style={[styles.statusText, { color: statusStyles.color }]}>
                {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
              </Text>
            </View>
          </View>

          {/* Reference Range */}
          {test.referenceRange && (
            <Text style={styles.referenceRange}>
              Range: {test.referenceRange.min ?? '—'} - {test.referenceRange.max ?? '—'} {test.unit}
            </Text>
          )}
        </View>

        {/* Chevron */}
        <View style={styles.chevron}>
          <Text style={styles.chevronText}>›</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSection = ({ item }: { item: typeof sections[0] }) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{item.category}</Text>
        <View style={styles.sectionCountBadge}>
          <Text style={styles.sectionCount}>{item.tests.length}</Text>
        </View>
      </View>
      {item.tests.map((test) => (
        <View key={test.id}>
          {renderTestCard({ item: test })}
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Lab Results</Text>
          <Text style={styles.headerSubtitle}>
            {mockLabTests.length} tests • Last updated today
          </Text>
        </View>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={[styles.summaryCard, { backgroundColor: colors.successLight }]}>
          <Text style={[styles.summaryNumber, { color: colors.successDark }]}>
            {normalCount}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.successDark }]}>Normal</Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: colors.warningLight }]}>
          <Text style={[styles.summaryNumber, { color: colors.warningDark }]}>
            {borderlineCount}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.warningDark }]}>Borderline</Text>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: colors.errorLight }]}>
          <Text style={[styles.summaryNumber, { color: colors.errorDark }]}>
            {abnormalCount}
          </Text>
          <Text style={[styles.summaryLabel, { color: colors.errorDark }]}>Abnormal</Text>
        </View>
      </View>

      {/* Test List */}
      <FlatList
        data={sections}
        renderItem={renderSection}
        keyExtractor={(item) => item.category}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  backIcon: {
    fontSize: 28,
    color: colors.textPrimary,
    fontWeight: '300',
    marginTop: -4,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listContent: {
    paddingBottom: 32,
  },
  section: {
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  sectionCountBadge: {
    marginLeft: 10,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  sectionCount: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statusIndicator: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  testName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  date: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  value: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  unit: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 6,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  referenceRange: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  chevron: {
    justifyContent: 'center',
    paddingRight: 16,
    paddingLeft: 8,
  },
  chevronText: {
    fontSize: 28,
    color: colors.neutral,
    fontWeight: '300',
  },
});
