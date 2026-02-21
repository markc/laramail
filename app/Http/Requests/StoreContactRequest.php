<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreContactRequest extends FormRequest
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
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:50',
            'org' => 'nullable|string|max:255',
            'title' => 'nullable|string|max:255',
            'url' => 'nullable|url|max:500',
            'note' => 'nullable|string|max:2000',
            'address' => 'nullable|string|max:500',
            'nickname' => 'nullable|string|max:255',
            'birthday' => 'nullable|date',
            'anniversary' => 'nullable|date',
            'categories' => 'nullable|string|max:500',
            'role' => 'nullable|string|max:255',
        ];
    }
}
