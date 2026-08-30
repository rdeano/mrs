<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Activitylog\Models\Activity;

class ActivityLogController extends Controller
{
    public function index(Request $request): Response
    {
        $activities = Activity::with('causer:id,name')
            ->when($request->causer_id, fn($q) => $q->where('causer_id', $request->causer_id))
            ->when($request->subject_type, fn($q) => $q->where('subject_type', $request->subject_type))
            ->when($request->from_date, fn($q) => $q->whereDate('created_at', '>=', $request->from_date))
            ->when($request->to_date, fn($q) => $q->whereDate('created_at', '<=', $request->to_date))
            ->orderByDesc('created_at')
            ->paginate(30)
            ->withQueryString()
            ->through(fn(Activity $a) => [
                'id'           => $a->id,
                'event'        => $a->event,
                'description'  => $a->description,
                'subject_type' => $a->subject_type ? class_basename($a->subject_type) : null,
                'subject_id'   => $a->subject_id,
                'causer_name'  => $a->causer?->name,
                'properties'   => $a->properties,
                'created_at'   => $a->created_at->format('Y-m-d H:i:s'),
            ]);

        $users = User::orderBy('name')->get(['id', 'name']);

        $subjectTypes = Activity::select('subject_type')
            ->whereNotNull('subject_type')
            ->distinct()
            ->pluck('subject_type')
            ->map(fn($t) => ['value' => $t, 'label' => class_basename($t)])
            ->sortBy('label')
            ->values();

        return Inertia::render('ActivityLog/Index', [
            'activities'   => $activities,
            'users'        => $users,
            'subjectTypes' => $subjectTypes,
            'filters'      => $request->only(['causer_id', 'subject_type', 'from_date', 'to_date']),
        ]);
    }
}
