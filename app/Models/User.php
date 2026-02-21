<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, TwoFactorAuthenticatable;

    public function conversations(): HasMany
    {
        return $this->hasMany(Conversation::class);
    }

    public function settings(): HasMany
    {
        return $this->hasMany(UserSetting::class);
    }

    public function setting(string $key, mixed $default = null): mixed
    {
        return $this->settings()->where('key', $key)->value('value') ?? $default;
    }

    public function systemPromptTemplates(): HasMany
    {
        return $this->hasMany(SystemPromptTemplate::class);
    }

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    public function sharedFiles(): HasMany
    {
        return $this->hasMany(SharedFile::class);
    }

    protected $fillable = [
        'name',
        'email',
        'password',
        'dav_principal_uri',
        'syncthing_path',
        'jmap_session_url',
        'jmap_token_encrypted',
        'jmap_account_id',
        'jmap_display_name',
        'jmap_token_expires_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'remember_token',
        'jmap_token_encrypted',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
            'jmap_token_encrypted' => 'encrypted',
            'jmap_token_expires_at' => 'datetime',
        ];
    }
}
