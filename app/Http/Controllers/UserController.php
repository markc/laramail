<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class UserController extends Controller
{
    public function index()
    {
        $users = User::select(['id', 'name', 'email', 'dav_principal_uri', 'created_at'])
            ->orderBy('id')
            ->get();

        return Inertia::render('users/index', [
            'users' => $users,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:8',
        ]);

        $validated['password'] = bcrypt($validated['password']);

        $user = User::create($validated);

        // Create DAV principal
        $uri = 'principals/' . $user->email;
        DB::table('principals')->insertOrIgnore([
            'uri' => $uri,
            'displayname' => $user->name,
            'email' => $user->email,
        ]);
        DB::table('principals')->insertOrIgnore([
            'uri' => $uri . '/calendar-proxy-read',
        ]);
        DB::table('principals')->insertOrIgnore([
            'uri' => $uri . '/calendar-proxy-write',
        ]);
        $user->update(['dav_principal_uri' => $uri]);

        return redirect()->back();
    }

    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email,' . $user->id,
            'password' => 'nullable|string|min:8',
        ]);

        if ($validated['password']) {
            $validated['password'] = bcrypt($validated['password']);
        } else {
            unset($validated['password']);
        }

        $user->update($validated);

        // Sync principal displayname/email
        if ($user->dav_principal_uri) {
            DB::table('principals')
                ->where('uri', $user->dav_principal_uri)
                ->update(['displayname' => $user->name, 'email' => $user->email]);
        }

        return redirect()->back();
    }

    public function destroy(User $user)
    {
        // Clean up principal
        if ($user->dav_principal_uri) {
            DB::table('principals')->where('uri', 'like', $user->dav_principal_uri . '%')->delete();
        }

        $user->delete();

        return redirect()->back();
    }
}
