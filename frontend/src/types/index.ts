// Purpose: Frontend module: index.
export interface User {
  userId: string;
  email: string;
  fullName: string;
  role: string;
  organization?: string;
  createdAt: string;
  lastLogin?: string;
  isActive: boolean;
}

export interface Field {
  fieldId: string;
  userId: string;
  fieldName: string;
  description?: string;
  location: {
    latitude: number;
    longitude: number;
  };
  areaHectares: number;
  cropType?: string;
  plantingDate?: string;
  expectedHarvestDate?: string;
  irrigationType?: string;
  status: 'active' | 'inactive' | 'harvested';
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export interface SoilData {
  soilDataId: string;
  fieldId: string;
  phLevel?: number;
  nitrogenPpm?: number;
  phosphorusPpm?: number;
  potassiumPpm?: number;
  organicMatterPercent?: number;
  moisturePercent?: number;
  temperatureCelsius?: number;
  sampleDate: string;
  labTested: boolean;
}

export interface WeatherData {
  weatherDataId: string;
  fieldId: string;
  temperatureCelsius?: number;
  humidityPercent?: number;
  pressureHpa?: number;
  rainfallMm?: number;
  windSpeedKmh?: number;
  windDirectionDegrees?: number;
  solarRadiationWm2?: number;
  recordedAt: string;
  dataSource: string;
}

export interface AIAnalysis {
  analysisId: string;
  fieldId: string;
  analysisType: string;
  summary: string;
  recommendations?: any[];
  confidenceScore?: number;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  riskFactors?: string[];
  yieldPrediction?: number;
  qualityScore?: number;
  modelVersion?: string;
  analyzedAt: string;
}

export interface Notification {
  notificationId: string;
  userId: string;
  fieldId?: string;
  notificationType: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  isRead: boolean;
  readAt?: string;
  actionUrl?: string;
  createdAt: string;
}

export interface FieldActivity {
  activityId: string;
  fieldId: string;
  userId: string;
  activityType: string;
  description?: string;
  startTime: string;
  endTime?: string;
  durationHours?: number;
  cost?: number;
  notes?: string;
  createdAt: string;
}

export interface FieldSummary extends Field {
  latestPh?: number;
  latestNitrogen?: number;
  latestTemperature?: number;
  latestHumidity?: number;
  latestAnalysis?: string;
  predictedYield?: number;
}

export interface DashboardStats {
  totalFields: number;
  totalArea: number;
  activeFields: number;
  unreadNotifications: number;
  averageYield?: number;
  fieldsAtRisk: number;
}
