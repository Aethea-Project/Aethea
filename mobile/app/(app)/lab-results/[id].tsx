import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { mockLabTests, mockLabHistory } from '@shared/data/mockData';
import { LabStatus } from '@shared/types/medical';
import { theme } from '@shared/ui/theme';

/**
 * Aethea - Lab Result Detail Screen (Mobile)
 * Individual test result with history and recommendations
 */

export default function LabResultDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const test = mockLabTests.find(t => t.id === id);
  const history = mockLabHistory.find(h => h.testName === test?.testName);

  if (!test) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Test result not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getStatusColor = (status: LabStatus) => {
    switch (status) {
      case 'normal':
        return theme.colors.success[500];
      case 'borderline':
        return theme.colors.warning[500];
      case 'abnormal':
      case 'critical':
        return theme.colors.error[500];
      default:
        return theme.colors.neutral[500];
    }
  };

  const getStatusIcon = (status: LabStatus) => {
    switch (status) {
      case 'normal':
        return '✓';
      case 'borderline':
        return '!';
      case 'abnormal':
      case 'critical':
        return '✕';
      default:
        return '?';
    }
  };

  const getStatusMessage = (status: LabStatus) => {
    switch (status) {
      case 'normal':
        return 'Your result is within the normal range.';
      case 'borderline':
        return 'Your result is slightly outside the normal range. Monitor and follow up as recommended.';
      case 'abnormal':
        return 'Your result is outside the normal range. Please consult with your doctor.';
      case 'critical':
        return 'This result requires immediate medical attention. Contact your doctor immediately.';
      default:
        return 'Status unknown.';
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.surface} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>{test.testName}</Text>
          <Text style={styles.headerSubtitle}>{test.category}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Card */}
        <View style={[styles.statusCard, { backgroundColor: getStatusColor(test.status) }]}>
          <View style={styles.statusHeader}>
            <View style={styles.statusIcon}>
              <Text style={styles.statusIconText}>{getStatusIcon(test.status)}</Text>
            </View>
            <Text style={styles.statusTitle}>{test.status.toUpperCase()}</Text>
          </View>
          <Text style={styles.statusMessage}>{getStatusMessage(test.status)}</Text>
        </View>

        {/* Result Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Result</Text>
          
          <View style={styles.resultContainer}>
            <View style={styles.resultMain}>
              <Text style={styles.resultValue}>
                {typeof test.value === 'number' ? test.value.toFixed(1) : test.value}
              </Text>
              <Text style={styles.resultUnit}>{test.unit}</Text>
            </View>

            <View style={styles.rangeBar}>
              <View style={styles.rangeTrack}>
                {test.referenceRange.min !== undefined && test.referenceRange.max !== undefined && (
                  <View
                    style={[
                      styles.rangeIndicator,
                      {
                        left: `${Math.max(0, Math.min(100, 
                          ((Number(test.value) - test.referenceRange.min) / 
                          (test.referenceRange.max - test.referenceRange.min)) * 100
                        ))}%`,
                        backgroundColor: getStatusColor(test.status),
                      },
                    ]}
                  />
                )}
              </View>
              
              <View style={styles.rangeLabels}>
                <Text style={styles.rangeLabel}>
                  {test.referenceRange.min ?? '—'}
                </Text>
                <Text style={[styles.rangeLabel, { textAlign: 'center' }]}>
                  Normal Range
                </Text>
                <Text style={[styles.rangeLabel, { textAlign: 'right' }]}>
                  {test.referenceRange.max ?? '—'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Details Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Test Details</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Test Date</Text>
            <Text style={styles.detailValue}>
              {test.date.toLocaleDateString('en-US', { 
                weekday: 'long',
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Ordered By</Text>
            <Text style={styles.detailValue}>{test.orderedBy}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Category</Text>
            <Text style={styles.detailValue}>{test.category}</Text>
          </View>

          {test.referenceRange.text ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Reference Range</Text>
              <Text style={styles.detailValue}>{test.referenceRange.text}</Text>
            </View>
          ) : (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Reference Range</Text>
              <Text style={styles.detailValue}>
                {test.referenceRange.min ?? '—'} - {test.referenceRange.max ?? '—'} {test.unit}
              </Text>
            </View>
          )}
        </View>

        {/* Notes Card */}
        {test.notes && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Doctor's Notes</Text>
            <Text style={styles.notesText}>{test.notes}</Text>
          </View>
        )}

        {/* History Card */}
        {history && history.data.length > 1 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Historical Trend</Text>
            <View style={styles.historyChart}>
              {history.data.map((dataPoint, index) => (
                <View key={index} style={styles.historyItem}>
                  <View
                    style={[
                      styles.historyBar,
                      {
                        height: `${(dataPoint.value / Math.max(...history.data.map(d => d.value))) * 100}%`,
                        backgroundColor: dataPoint.value === Number(test.value) 
                          ? getStatusColor(test.status)
                          : theme.colors.neutral[300],
                      },
                    ]}
                  />
                  <Text style={styles.historyValue}>{dataPoint.value.toFixed(1)}</Text>
                  <Text style={styles.historyDate}>
                    {dataPoint.date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryButton} activeOpacity={0.8}>
            <Text style={styles.primaryButtonText}>Schedule Follow-up</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.8}>
            <Text style={styles.secondaryButtonText}>Download Report</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: parseInt(theme.spacing[6]),
  },
  errorText: {
    fontSize: parseInt(theme.typography.fontSize.lg) * 16,
    color: theme.colors.text.secondary,
    marginBottom: parseInt(theme.spacing[6]),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: parseInt(theme.spacing[4]),
    paddingTop: parseInt(theme.spacing[8]),
    paddingBottom: parseInt(theme.spacing[4]),
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 32,
    color: theme.colors.primary[600],
    fontWeight: '300',
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: parseInt(theme.spacing[2]),
  },
  headerTitle: {
    fontSize: parseInt(theme.typography.fontSize.xl) * 16,
    fontWeight: theme.typography.fontWeight.bold.toString(),
    color: theme.colors.text.primary,
  },
  headerSubtitle: {
    fontSize: parseInt(theme.typography.fontSize.sm) * 16,
    color: theme.colors.text.secondary,
    marginTop: parseInt(theme.spacing[1]),
  },
  backButtonText: {
    fontSize: parseInt(theme.typography.fontSize.base) * 16,
    color: theme.colors.primary[600],
    fontWeight: theme.typography.fontWeight.semibold.toString(),
  },
  content: {
    flex: 1,
  },
  statusCard: {
    margin: parseInt(theme.spacing[6]),
    padding: parseInt(theme.spacing[5]),
    borderRadius: parseInt(theme.borderRadius.lg),
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: parseInt(theme.spacing[3]),
  },
  statusIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: parseInt(theme.spacing[3]),
  },
  statusIconText: {
    fontSize: 18,
    color: theme.colors.surface,
    fontWeight: theme.typography.fontWeight.bold.toString(),
  },
  statusTitle: {
    fontSize: parseInt(theme.typography.fontSize.lg) * 16,
    fontWeight: theme.typography.fontWeight.bold.toString(),
    color: theme.colors.surface,
  },
  statusMessage: {
    fontSize: parseInt(theme.typography.fontSize.base) * 16,
    color: theme.colors.surface,
    lineHeight: parseInt(theme.typography.fontSize.base) * 16 * theme.typography.lineHeight.relaxed,
  },
  card: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: parseInt(theme.spacing[6]),
    marginBottom: parseInt(theme.spacing[4]),
    padding: parseInt(theme.spacing[5]),
    borderRadius: parseInt(theme.borderRadius.lg),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTitle: {
    fontSize: parseInt(theme.typography.fontSize.lg) * 16,
    fontWeight: theme.typography.fontWeight.semibold.toString(),
    color: theme.colors.text.primary,
    marginBottom: parseInt(theme.spacing[4]),
  },
  resultContainer: {
    alignItems: 'center',
  },
  resultMain: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: parseInt(theme.spacing[6]),
  },
  resultValue: {
    fontSize: parseInt(theme.typography.fontSize['5xl']) * 16,
    fontWeight: theme.typography.fontWeight.bold.toString(),
    color: theme.colors.primary[600],
  },
  resultUnit: {
    fontSize: parseInt(theme.typography.fontSize.xl) * 16,
    color: theme.colors.text.secondary,
    marginLeft: parseInt(theme.spacing[2]),
  },
  rangeBar: {
    width: '100%',
    marginBottom: parseInt(theme.spacing[2]),
  },
  rangeTrack: {
    height: 8,
    backgroundColor: theme.colors.neutral[200],
    borderRadius: parseInt(theme.borderRadius.full),
    position: 'relative',
    marginBottom: parseInt(theme.spacing[2]),
  },
  rangeIndicator: {
    position: 'absolute',
    top: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: theme.colors.surface,
    transform: [{ translateX: -8 }],
  },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rangeLabel: {
    flex: 1,
    fontSize: parseInt(theme.typography.fontSize.sm) * 16,
    color: theme.colors.text.secondary,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: parseInt(theme.spacing[3]),
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  detailLabel: {
    fontSize: parseInt(theme.typography.fontSize.base) * 16,
    color: theme.colors.text.secondary,
    flex: 1,
  },
  detailValue: {
    fontSize: parseInt(theme.typography.fontSize.base) * 16,
    color: theme.colors.text.primary,
    fontWeight: theme.typography.fontWeight.medium.toString(),
    flex: 1,
    textAlign: 'right',
  },
  notesText: {
    fontSize: parseInt(theme.typography.fontSize.base) * 16,
    color: theme.colors.text.primary,
    lineHeight: parseInt(theme.typography.fontSize.base) * 16 * theme.typography.lineHeight.relaxed,
  },
  historyChart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 150,
    paddingTop: parseInt(theme.spacing[4]),
  },
  historyItem: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: parseInt(theme.spacing[1]),
  },
  historyBar: {
    width: '80%',
    minHeight: 20,
    borderRadius: parseInt(theme.borderRadius.sm),
    marginBottom: parseInt(theme.spacing[2]),
  },
  historyValue: {
    fontSize: parseInt(theme.typography.fontSize.xs) * 16,
    fontWeight: theme.typography.fontWeight.semibold.toString(),
    color: theme.colors.text.primary,
    marginBottom: parseInt(theme.spacing[1]),
  },
  historyDate: {
    fontSize: parseInt(theme.typography.fontSize.xs) * 16,
    color: theme.colors.text.secondary,
  },
  actions: {
    padding: parseInt(theme.spacing[6]),
    paddingBottom: parseInt(theme.spacing[8]),
  },
  primaryButton: {
    backgroundColor: theme.colors.primary[600],
    paddingVertical: parseInt(theme.spacing[4]),
    borderRadius: parseInt(theme.borderRadius.md),
    alignItems: 'center',
    marginBottom: parseInt(theme.spacing[3]),
    minHeight: 48,
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: parseInt(theme.typography.fontSize.base) * 16,
    fontWeight: theme.typography.fontWeight.semibold.toString(),
    color: theme.colors.surface,
  },
  secondaryButton: {
    backgroundColor: theme.colors.surface,
    paddingVertical: parseInt(theme.spacing[4]),
    borderRadius: parseInt(theme.borderRadius.md),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 48,
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: parseInt(theme.typography.fontSize.base) * 16,
    fontWeight: theme.typography.fontWeight.semibold.toString(),
    color: theme.colors.primary[600],
  },
});
