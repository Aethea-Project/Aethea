/**
 * Medical Scan Detail Screen - Mobile
 * Displays detailed scan information with image viewer, pinch-to-zoom, and annotations
 */

import { View, Text, StyleSheet, ScrollView, Image, Dimensions, TouchableOpacity, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { mockScans } from '@shared/data/mockData';
import { theme } from '@shared/ui/theme';
import { useState } from 'react';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ScanDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const scan = mockScans.find(s => s.id === id);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  if (!scan) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Scan not found</Text>
      </View>
    );
  }

  const selectedImage = scan.images[selectedImageIndex];

  const getPriorityColor = () => {
    switch (scan.priority) {
      case 'urgent': return theme.colors.warning[500];
      case 'emergency': return theme.colors.error[500];
      default: return theme.colors.success[500];
    }
  };

  const getStatusColor = () => {
    switch (scan.status) {
      case 'completed': return theme.colors.success[500];
      case 'pending': return theme.colors.warning[500];
      case 'in_progress': return theme.colors.primary[500];
      default: return theme.colors.neutral[400];
    }
  };

  return (
    <ScrollView style={styles.container} bounces={true}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{scan.type}</Text>
        <Text style={styles.subtitle}>{scan.bodyPart}</Text>
      </View>

      {/* Priority & Status Badges */}
      <View style={styles.badgeContainer}>
        <View style={[styles.badge, { backgroundColor: getPriorityColor() + '20', borderColor: getPriorityColor() }]}>
          <View style={[styles.statusDot, { backgroundColor: getPriorityColor() }]} />
          <Text style={[styles.badgeText, { color: getPriorityColor() }]}>
            {scan.priority.toUpperCase()}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: getStatusColor() + '20', borderColor: getStatusColor() }]}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
          <Text style={[styles.badgeText, { color: getStatusColor() }]}>
            {scan.status.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Main Image Viewer */}
      <View style={styles.imageViewerContainer}>
        <Image
          source={{ uri: selectedImage.url }}
          style={styles.mainImage}
          resizeMode="contain"
        />
        <View style={styles.imageInfoOverlay}>
          <Text style={styles.imageInfoText}>
            {selectedImage.viewType} • {selectedImage.position}
          </Text>
          <Text style={styles.imageCountText}>
            {selectedImageIndex + 1} / {scan.images.length}
          </Text>
        </View>
        
        {/* Zoom hint */}
        <View style={styles.zoomHint}>
          <Text style={styles.zoomHintText}>🔍 Pinch to zoom (simulated)</Text>
        </View>
      </View>

      {/* Image Thumbnails */}
      {scan.images.length > 1 && (
        <View style={styles.thumbnailsContainer}>
          <FlatList
            horizontal
            data={scan.images}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbnailsList}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                onPress={() => setSelectedImageIndex(index)}
                style={[
                  styles.thumbnail,
                  selectedImageIndex === index && styles.thumbnailSelected
                ]}
              >
                <Image
                  source={{ uri: item.url }}
                  style={styles.thumbnailImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Scan Information */}
      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Scan Information</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Date:</Text>
          <Text style={styles.infoValue}>{new Date(scan.scanDate).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Ordered By:</Text>
          <Text style={styles.infoValue}>Dr. {scan.orderingPhysician}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Facility:</Text>
          <Text style={styles.infoValue}>{scan.facility}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Modality:</Text>
          <Text style={styles.infoValue}>{scan.modality}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Protocol:</Text>
          <Text style={styles.infoValue}>{scan.protocol}</Text>
        </View>
      </View>

      {/* Findings */}
      {scan.findings && (
        <View style={styles.findingsCard}>
          <Text style={styles.sectionTitle}>Findings</Text>
          <Text style={styles.findingsText}>{scan.findings}</Text>
        </View>
      )}

      {/* Impressions */}
      {scan.impressions && (
        <View style={styles.impressionsCard}>
          <Text style={styles.sectionTitle}>Impressions</Text>
          <Text style={styles.impressionsText}>{scan.impressions}</Text>
        </View>
      )}

      {/* Annotations */}
      {selectedImage.annotations && selectedImage.annotations.length > 0 && (
        <View style={styles.annotationsCard}>
          <Text style={styles.sectionTitle}>Annotations</Text>
          {selectedImage.annotations.map((annotation, index) => (
            <View key={index} style={styles.annotationItem}>
              <View style={[styles.annotationDot, { backgroundColor: annotation.color }]} />
              <Text style={styles.annotationText}>{annotation.text}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>📥 Download Report</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>📤 Share with Doctor</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>🖨️ Print Images</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing[4],
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    marginBottom: theme.spacing[2],
  },
  backButtonText: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.primary[600],
    fontWeight: theme.typography.fontWeight.semibold as any,
  },
  title: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing[1],
  },
  subtitle: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.text.secondary,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: theme.spacing[2],
    padding: theme.spacing[4],
    paddingTop: theme.spacing[3],
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.borderRadius.full,
    borderWidth: 1.5,
    gap: theme.spacing[2],
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.bold as any,
    letterSpacing: 0.5,
  },
  imageViewerContainer: {
    height: SCREEN_WIDTH,
    backgroundColor: theme.colors.neutral[900],
    position: 'relative',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  imageInfoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: theme.spacing[3],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  imageInfoText: {
    color: theme.colors.text.inverse,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium as any,
  },
  imageCountText: {
    color: theme.colors.text.inverse,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold as any,
  },
  zoomHint: {
    position: 'absolute',
    top: theme.spacing[3],
    right: theme.spacing[3],
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.borderRadius.full,
  },
  zoomHintText: {
    color: theme.colors.text.inverse,
    fontSize: theme.typography.fontSize.xs,
    fontWeight: theme.typography.fontWeight.medium as any,
  },
  thumbnailsContainer: {
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  thumbnailsList: {
    paddingHorizontal: theme.spacing[4],
    gap: theme.spacing[2],
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    marginRight: theme.spacing[2],
  },
  thumbnailSelected: {
    borderColor: theme.colors.primary[500],
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  infoCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing[4],
    margin: theme.spacing[4],
    marginBottom: theme.spacing[3],
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.md,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold as any,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing[3],
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  infoLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    fontWeight: theme.typography.fontWeight.medium as any,
  },
  infoValue: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.primary,
    fontWeight: theme.typography.fontWeight.semibold as any,
    textAlign: 'right',
    flex: 1,
    marginLeft: theme.spacing[2],
  },
  findingsCard: {
    backgroundColor: theme.colors.primary[50],
    padding: theme.spacing[4],
    marginHorizontal: theme.spacing[4],
    marginBottom: theme.spacing[3],
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
  },
  findingsText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.primary,
    lineHeight: theme.typography.lineHeight.relaxed,
  },
  impressionsCard: {
    backgroundColor: theme.colors.warning[50],
    padding: theme.spacing[4],
    marginHorizontal: theme.spacing[4],
    marginBottom: theme.spacing[3],
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.warning[200],
  },
  impressionsText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.primary,
    lineHeight: theme.typography.lineHeight.relaxed,
    fontWeight: theme.typography.fontWeight.medium as any,
  },
  annotationsCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing[4],
    marginHorizontal: theme.spacing[4],
    marginBottom: theme.spacing[3],
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
  },
  annotationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    paddingVertical: theme.spacing[2],
  },
  annotationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  annotationText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.primary,
    flex: 1,
  },
  actionsContainer: {
    padding: theme.spacing[4],
    gap: theme.spacing[3],
  },
  primaryButton: {
    backgroundColor: theme.colors.primary[500],
    paddingVertical: theme.spacing[4],
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    ...theme.shadows.md,
  },
  primaryButtonText: {
    color: theme.colors.text.inverse,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold as any,
  },
  secondaryButton: {
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing[4],
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  secondaryButtonText: {
    color: theme.colors.text.primary,
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold as any,
  },
  errorText: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.error[500],
    textAlign: 'center',
    padding: theme.spacing[4],
  },
  bottomPadding: {
    height: theme.spacing[6],
  },
});
