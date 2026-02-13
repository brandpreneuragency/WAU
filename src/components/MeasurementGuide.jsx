import React from 'react'
import { Play, Ruler, CheckCircle2, Info } from 'lucide-react'

export default function MeasurementGuide() {
    const measurementGroups = [
        {
            id: 'chest',
            title: 'Chest Measurement',
            points: [
                'Measure around the fullest part of the chest',
                'Keep the tape measure level and snug but not tight',
                'Arms should be relaxed at sides'
            ]
        },
        {
            id: 'waist',
            title: 'Waist Measurement',
            points: [
                'Measure around the natural waistline',
                'Usually the narrowest part of the torso',
                "Don't pull too tight or leave too loose"
            ]
        },
        {
            id: 'height',
            title: 'Height Measurement',
            points: [
                'Stand straight against a flat wall without shoes',
                'Keep feet together and flat on the floor',
                'Level point from top of head to the wall'
            ]
        }
    ]

    const proTips = [
        'Use a flexible measuring tape for accuracy',
        'Take measurements over light clothing or undergarments',
        'Record measurements immediately to avoid forgetting'
    ]

    return (
        <div className="space-y-8 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar">
            {/* Video Placeholder */}
            <div className="aspect-video bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center p-8 text-center group cursor-pointer hover:bg-gray-100 transition-colors">
                <div className="w-16 h-16 bg-white rounded-full shadow-soft-md flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Play className="w-6 h-6 text-gray-900 fill-gray-900" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">Body Measurement Tutorial Video</h4>
                <p className="text-sm text-gray-500">Professional guide for accurate uniform sizing</p>
            </div>

            {/* Measurement Steps */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
                {measurementGroups.map((group) => (
                    <div key={group.id} className="space-y-3">
                        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                            <Ruler className="w-4 h-4 text-blue-500" />
                            {group.title}
                        </h4>
                        <ul className="space-y-2">
                            {group.points.map((point, i) => (
                                <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5 flex-shrink-0" />
                                    {point}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            {/* Pro Tips Section */}
            <div className="bg-blue-50/50 rounded-3xl p-6 border border-blue-100">
                <h4 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
                    <Info className="w-5 h-5" />
                    Pro Tips
                </h4>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {proTips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-blue-800">
                            <CheckCircle2 className="w-4 h-4 mt-0.5 text-blue-600 flex-shrink-0" />
                            {tip}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}
