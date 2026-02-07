import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { mockScans } from '@shared/data/mockData';
import { MedicalScan, ScanPriority, ScanStatus } from '@shared/types/medical';

/**
 * Aethea - Medical Scans List Screen (Mobile)
 * Professional gallery view with scan thumbnails
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

export default function ScansScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const getPriorityStyles = (priority: ScanPriority) => {
    switch (priority) {
      case 'routine':
        return { color: colors.successDark, bg: colors.successLight };
      case 'urgent':
        return { color: colors.warningDark, bg: colors.warningLight };
      case 'emergency':
        return { color: colors.errorDark, bg: colors.errorLight };
      default:
        return { color: colors.neutral, bg: '#F1F5F9' };
    }
  };

  const getStatusStyles = (status: ScanStatus) => {
    switch (status) {
      case 'completed':
      case 'reviewed':
        return { color: colors.successDark, indicator: colors.success };
      case 'in-progress':
        return { color: colors.warningDark, indicator: colors.warning };
      case 'pending':
        return { color: colors.neutral, indicator: colors.neutral };
      default:
        return { color: colors.neutral, indicator: colors.neutral };
    }
  };

  const renderScanCard = ({ item: scan }: { item: MedicalScan }) => {
    const priorityStyles = getPriorityStyles(scan.priority);
    const statusStyles = getStatusStyles(scan.status);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/(app)/scans/${scan.id}`)}
        activeOpacity={0.85}
        accessible={true}
        accessibilityLabel={`${scan.type} of ${scan.bodyPart}, ${scan.priority} priority`}
        accessibilityHint="Tap to view scan images and report"
        accessibilityRole="button"
      >
        {/* Image Gallery Preview */}
        <View style={styles.imageGrid}>
          {scan.images.slice(0, 4).map((image, index) => (
            <View
              key={image.id}
              style={[
                styles.imageGridItem,
                scan.images.length === 1 && styles.imageGridFull,
                scan.images.length === 2 && styles.imageGridHalf,
              ]}
            >
              <Image source={{ uri: image.thumbnail }} style={styles.thumbnail} />
              {index === 3 && scan.images.length > 4 && (
                <View style={styles.moreOverlay}>
                  <Text style={styles.moreText}>+{scan.images.length - 4}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Scan Info */}
        <View style={styles.cardContent}>
          {/* Type & Body Part */}
          <View style={styles.scanHeader}>
            <View style={styles.scanInfo}>
              <Text style={styles.scanType}>{scan.type}</Text>
              <Text style={styles.bodyPart}>{scan.bodyPart}</Text>
            </View>

            {/* Priority Badge */}
            <View style={[styles.priorityBadge, { backgroundColor: priorityStyles.bg }]}>
              <Text style={[styles.priorityText, { color: priorityStyles.color }]}>
                {scan.priority.charAt(0).toUpperCase() + scan.priority.slice(1)}
              </Text>
            </View>
          </View>

          {/* Description */}
          <Text style={styles.description} numberOfLines={2}>
            {scan.description}
          </Text>

          {/* Footer Info */}
          <View style={styles.cardFooter}>
            <View style={styles.footerItem}>
              <Text style={styles.footerLabel}>Date</Text>
              <Text style={styles.footerValue}>
                {scan.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
            </View>

            <View style={styles.footerDivider} />

            <View style={styles.footerItem}>
              <Text style={styles.footerLabel}>Images</Text>
              <Text style={styles.footerValue}>{scan.images.length}</Text>
            </View>

            <View style={styles.footerDivider} />

            <View style={styles.footerItem}>
              <Text style={styles.footerLabel}>Status</Text>
              <View style={styles.statusDot}>
                <View style={[styles.statusIndicator, { backgroundColor: statusStyles.indicator }]} />
                <Text style={[styles.footerValue, { color: statusStyles.color }]}>
                  {scan.status.replace('-', ' ').split(' ').map(w => 
                    w.charAt(0).toUpperCase() + w.slice(1)
                  ).join(' ')}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

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
          <Text style={styles.headerTitle}>Medical Scans</Text>
          <Text style={styles.headerSubtitle}>
            {mockScans.length} scans • All imaging records
          </Text>
        </View>
      </View>

      {/* Scan List */}
      <FlatList
        data={mockScans}
        renderItem={renderScanCard}
        keyExtractor={(item) => item.id}
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
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    height: 180,
  },
  imageGridItem: {
    width: '50%',
    height: '50%',
    padding: 1,
    position: 'relative',
  },
  imageGridFull: {
    width: '100%',
    height: '100%',
  },
  imageGridHalf: {
    width: '50%',
    height: '100%',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E2E8F0',
    resizeMode: 'cover',
  },
  moreOverlay: {
    position: 'absolute',
    top: 1,
    left: 1,
    right: 1,
    bottom: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardContent: {
    padding: 20,
  },
  scanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  scanInfo: {
    flex: 1,
  },
  scanType: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  bodyPart: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 12,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerItem: {
    flex: 1,
  },
  footerLabel: {
    fontSize: 11,
    color: colors.neutral,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  footerValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  footerDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
    marginHorizontal: 12,
  },
  statusDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
