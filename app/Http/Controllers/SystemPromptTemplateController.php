<?php

namespace App\Http\Controllers;

use App\Models\SystemPromptTemplate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SystemPromptTemplateController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:100',
            'prompt' => 'required|string|max:5000',
        ]);

        Auth::user()->systemPromptTemplates()->create($request->only('name', 'prompt'));

        return back();
    }

    public function update(Request $request, SystemPromptTemplate $template)
    {
        abort_unless($template->user_id === Auth::id(), 403);

        $request->validate([
            'name' => 'required|string|max:100',
            'prompt' => 'required|string|max:5000',
        ]);

        $template->update($request->only('name', 'prompt'));

        return back();
    }

    public function destroy(SystemPromptTemplate $template)
    {
        abort_unless($template->user_id === Auth::id(), 403);

        $template->delete();

        return back();
    }
}
