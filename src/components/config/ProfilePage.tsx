import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getProfileSnapshot } from '@/data/profile-repository';
import useProfile from '@/hooks/use-profile';
import type { UserProfile } from '@/types/account';

type ProfileEditorProps = {
  readonly initialProfile: UserProfile;
  readonly isSaving: boolean;
  readonly onSave: (profile: Partial<UserProfile>) => Promise<void>;
  readonly onClearCv: () => Promise<void>;
};

function ProfileEditor({ initialProfile, isSaving, onSave, onClearCv }: ProfileEditorProps) {
  const [headline, setHeadline] = useState(initialProfile.headline);
  const [summary, setSummary] = useState(initialProfile.summary);
  const [skills, setSkills] = useState(initialProfile.skills_text);
  const [linkedinUrl, setLinkedinUrl] = useState(initialProfile.linkedin_url);
  const [linkedinText, setLinkedinText] = useState(initialProfile.linkedin_text);
  const [cvFileName, setCvFileName] = useState<string | null>(initialProfile.cv_file_name);
  const [cvText, setCvText] = useState(initialProfile.cv_extracted_text ?? '');
  const [fileInputKey, setFileInputKey] = useState(0);

  async function handleSave() {
    await onSave({
      headline,
      summary,
      skills_text: skills,
      linkedin_url: linkedinUrl,
      linkedin_text: linkedinText,
      cv_file_name: cvFileName,
      cv_extracted_text: cvText || null,
      cv_uploaded_at: cvFileName ? new Date().toISOString() : null,
    });
  }

  return (
    <>
      <section className="space-y-4 rounded-none border border-border p-4">
        <h2 className="font-heading text-lg font-semibold tracking-wide uppercase">Perfil base</h2>
        <div className="grid gap-4">
          <div className="space-y-2">
            <label htmlFor="profile-headline" className="text-sm font-medium">
              Titular profesional
            </label>
            <Input
              id="profile-headline"
              value={headline}
              onChange={(event) => setHeadline(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="profile-summary" className="text-sm font-medium">
              Resumen
            </label>
            <Textarea
              id="profile-summary"
              rows={4}
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="profile-skills" className="text-sm font-medium">
              Skills
            </label>
            <Textarea
              id="profile-skills"
              rows={3}
              value={skills}
              onChange={(event) => setSkills(event.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-none border border-border p-4">
        <h2 className="font-heading text-lg font-semibold tracking-wide uppercase">LinkedIn</h2>
        <div className="grid gap-4">
          <div className="space-y-2">
            <label htmlFor="profile-linkedin-url" className="text-sm font-medium">
              URL de LinkedIn
            </label>
            <Input
              id="profile-linkedin-url"
              value={linkedinUrl}
              onChange={(event) => setLinkedinUrl(event.target.value)}
              placeholder="https://linkedin.com/in/..."
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="profile-linkedin-text" className="text-sm font-medium">
              Texto del perfil
            </label>
            <Textarea
              id="profile-linkedin-text"
              rows={8}
              value={linkedinText}
              onChange={(event) => setLinkedinText(event.target.value)}
              placeholder="Pega aquí el texto de LinkedIn o tu exportación."
            />
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-none border border-border p-4">
        <h2 className="font-heading text-lg font-semibold tracking-wide uppercase">CV PDF</h2>
        <input
          key={fileInputKey}
          type="file"
          accept="application/pdf"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            setCvFileName(file?.name ?? null);
            setCvText('');
          }}
        />
        <div className="rounded-none border border-dashed border-border p-4 text-sm text-muted-foreground">
          {cvFileName ? (
            <div className="space-y-1">
              <p className="font-medium text-foreground">{cvFileName}</p>
              <p>{cvText || 'Texto pendiente de extracción y almacenamiento privado.'}</p>
            </div>
          ) : (
            'Aquí se mostrará el texto procesado del CV una vez cargado.'
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => void handleSave()} disabled={isSaving}>
            Guardar perfil
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              await onClearCv();
              setCvFileName(null);
              setCvText('');
              setFileInputKey((current) => current + 1);
            }}
          >
            Borrar CV
          </Button>
        </div>
      </section>
    </>
  );
}

export default function ProfilePage() {
  const { saveProfile, clearCv, data: profileData, isLoading } = useProfile();
  const initialProfile = profileData ?? getProfileSnapshot();

  return (
    <div className="h-full overflow-y-auto px-4 py-4 lg:px-6">
      <div className="space-y-4">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-wide uppercase">Perfil</h1>
          <p className="text-sm text-muted-foreground">
            Configura el perfil profesional que se usará para comparar ofertas y señales.
          </p>
        </div>

        <ProfileEditor
          key={initialProfile.updated_at}
          initialProfile={initialProfile}
          isSaving={isLoading}
          onSave={saveProfile}
          onClearCv={clearCv}
        />
      </div>
    </div>
  );
}
