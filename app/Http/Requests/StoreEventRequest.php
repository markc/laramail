<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreEventRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'summary' => 'required|string|max:255',
            'dtstart' => 'required|date',
            'dtend' => 'nullable|date|after_or_equal:dtstart',
            'location' => 'nullable|string|max:500',
            'description' => 'nullable|string|max:2000',
        ];
    }
}
