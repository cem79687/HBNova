export type ClientType = "particulier" | "professionnel";

export type Client = {
  id: string;
  type: ClientType;
  nom: string;
  telephone: string | null;
  email: string | null;
  adresse_facturation: string | null;
  adresse_chantier: string | null;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Contact = {
  id: string;
  client_id: string;
  nom: string;
  fonction: string | null;
  telephone: string | null;
  email: string | null;
  created_at: string;
};
