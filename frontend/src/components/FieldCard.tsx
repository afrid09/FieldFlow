// Purpose: Frontend module: FieldCard.
import { MapPin, TrendingUp, Droplet, AlertCircle } from 'lucide-react';
import { FieldSummary } from '@/types';
import { motion } from 'framer-motion';

interface FieldCardProps {
  field: FieldSummary;
}

export default function FieldCard({ field }: FieldCardProps) {
  const getRiskColor = (prediction?: number) => {
    if (!prediction) return 'gray';
    if (prediction > 150) return 'green';
    if (prediction > 100) return 'yellow';
    return 'red';
  };

  const riskColor = getRiskColor(field.predictedYield);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4 }}
      className="bg-white rounded-lg border shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-primary-50 to-primary-100 border-b">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{field.fieldName}</h3>
            <p className="text-sm text-gray-600 mt-1">{field.cropType || 'No crop set'}</p>
          </div>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            field.status === 'active' 
              ? 'bg-green-100 text-green-700' 
              : 'bg-gray-100 text-gray-700'
          }`}>
            {field.status}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Location */}
        <div className="flex items-center text-sm text-gray-600">
          <MapPin className="h-4 w-4 mr-2" />
          <span>{field.areaHectares} hectares</span>
        </div>

        {/* Latest Data */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center space-x-2">
            <Droplet className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-xs text-gray-500">pH Level</p>
              <p className="text-sm font-medium">{field.latestPh?.toFixed(1) ?? 'N/A'}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <div>
              <p className="text-xs text-gray-500">Nitrogen</p>
              <p className="text-sm font-medium">{field.latestNitrogen?.toFixed(0) ?? 'N/A'} ppm</p>
            </div>
          </div>
        </div>

        {/* Prediction */}
        {field.predictedYield && (
          <div className={`mt-3 p-3 rounded-lg bg-${riskColor}-50 border border-${riskColor}-200`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-700">Predicted Yield</span>
              <span className="text-sm font-bold text-gray-900">
                {field.predictedYield.toFixed(1)} tons/ha
              </span>
            </div>
          </div>
        )}

        {/* Latest Analysis */}
        {field.latestAnalysis && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-primary-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-gray-600 line-clamp-2">{field.latestAnalysis}</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t">
        <button className="w-full text-sm font-medium text-primary-600 hover:text-primary-700">
          View Details →
        </button>
      </div>
    </motion.div>
  );
}
