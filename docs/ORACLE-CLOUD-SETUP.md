# Backend F1 Stats su Oracle Cloud Free Tier

Guida per creare una VM, esporre il backend e farlo partire in modo stabile.

---

## 1. Creare la VM (se non l’hai già)

1. Vai su [Oracle Cloud](https://cloud.oracle.com) → **Create a free account** (se serve).
2. Dal menu ☰ → **Compute** → **Instances** → **Create instance**.
3. **Name:** es. `f1-stats-backend`.
4. **Placement:** lascia il default.
5. **Image and shape:**
   - **Image:** Ubuntu 22.04 (o 24.04).
   - **Shape:** **Ampere** → **VM.Standard.A1.Flex** (1 OCPU, 6 GB RAM – rientra nel free tier).
6. **Networking:** lascia la VCN di default; assicurati che **Assign a public IPv4 address** sia selezionato.
7. **Add SSH keys:** carica la tua chiave pubblica (o “Generate a key pair for me” e scarica la chiave privata).
8. Clicca **Create**.

Quando lo stato è **Running**, annota l’**IP pubblico** (es. `132.145.xxx.xxx`).

---

## 2. Aprire la porta 8000 (Security List)

Il backend ascolta sulla porta **8000**. Devi aprire questa porta nel firewall della VCN.

1. Dal menu ☰ → **Networking** → **Virtual cloud networks**.
2. Clicca sulla VCN usata dalla tua VM (es. quella di default).
3. Clicca sulla **Subnet** (es. “Public subnet-…”).
4. Sotto **Security Lists**, clicca sulla **Default Security List**.
5. **Ingress Rules** → **Add Ingress Rules**:
   - **Source CIDR:** `0.0.0.0/0`
   - **IP Protocol:** TCP
   - **Source port range:** (lascia vuoto)
   - **Destination port range:** `8000`
   - **Description:** `F1 Stats backend`
6. **Add Ingress Rules**.

(Se usi **Instance Firewall** su Oracle, apri anche lì la porta 8000 se previsto.)

---

## 3. Collegarti alla VM (SSH)

Da Windows (PowerShell o terminale con OpenSSH):

```bash
132.145.xxx.xxx
```

Sostituisci con il **tuo** IP pubblico e il path della chiave. Su Linux/macOS è uguale.

---

## 4. Installare Python e dipendenze sulla VM

Sulla VM (es. Ubuntu):

```bash
# Aggiorna i pacchetti
sudo apt update && sudo apt upgrade -y

# Python 3 e venv
sudo apt install -y python3 python3-pip python3-venv

# Verifica
python3 --version   # dovrebbe essere 3.10+
```

---

## 5. Copiare il backend sulla VM

**Opzione A – Hai già il repo su GitHub**

```bash
# Installa git se non c’è
sudo apt install -y git

# Clona (sostituisci con il TUO repo)
git clone https://github.com/TUO-USERNAME/TUO-REPO.git f1-stats
cd f1-stats/backend
```

**Opzione B – Copiare da PC con SCP**

Sul **tuo PC** (PowerShell), dalla cartella del progetto:

```powershell
scp -i "path\to\chiave.key" -r "c:\Users\yuris\Desktop\F1 Stats\backend" ubuntu@132.145.xxx.xxx:~/
```

Poi in SSH sulla VM:

```bash
cd ~/backend
```

---

## 6. Ambiente virtuale e variabili

Sulla VM, nella cartella `backend`:

```bash
cd ~/backend   # oppure ~/f1-stats/backend se hai clonato

python3 -m venv .venv
source .venv/bin/activate

pip install --upgrade pip
pip install -r requirements.txt
```

Crea il file `.env`:

```bash
nano .env
```

Inserisci (sostituisci con la **tua** URL Vercel):

```env
PORT=8000
CORS_ORIGINS=https://tuo-sito.vercel.app
```

Salva (Ctrl+O, Invio, Ctrl+X).

Per test locale da browser puoi aggiungere temporaneamente:

```env
CORS_ORIGINS=http://localhost:3000,https://tuo-sito.vercel.app
```

---

## 7. Avviare il backend

**Test rapido:**

```bash
source .venv/bin/activate
python main.py
```

Oppure, dalla cartella `backend`:

```bash
chmod +x scripts/start-backend.sh
./scripts/start-backend.sh
```

Da un altro terminale o dal PC:

```bash
curl http://132.145.xxx.xxx:8000/health
```

Dovresti vedere: `{"status":"ok","service":"f1-stats-backend"}`.

Per fermare: `Ctrl+C`.

---

## 8. Farlo partire sempre (systemd)

Per avere il backend attivo anche dopo logout e riavvio della VM:

```bash
sudo nano /etc/systemd/system/f1-stats-backend.service
```

Incolla (adatta `WorkingDirectory` e `User` se la cartella è diversa):

```ini
[Unit]
Description=F1 Stats Backend
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/backend
Environment="PATH=/home/ubuntu/backend/.venv/bin"
EnvironmentFile=/home/ubuntu/backend/.env
ExecStart=/home/ubuntu/backend/.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Se hai clonato in `~/f1-stats/backend`:

- `WorkingDirectory=/home/ubuntu/f1-stats/backend`
- `Environment="PATH=/home/ubuntu/f1-stats/backend/.venv/bin"`
- `ExecStart=/home/ubuntu/f1-stats/backend/.venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000`
- `EnvironmentFile=/home/ubuntu/f1-stats/backend/.env`

Poi:

```bash
sudo systemctl daemon-reload
sudo systemctl enable f1-stats-backend
sudo systemctl start f1-stats-backend
sudo systemctl status f1-stats-backend
```

Se vedi `active (running)` è tutto ok.

**Se vedi `activating (auto-restart)` e `status=203/EXEC`:** il path in `ExecStart` (e negli altri campi) è sbagliato: systemd non trova l’eseguibile. Controlla che **WorkingDirectory**, **Environment**, **EnvironmentFile** e **ExecStart** usino esattamente la cartella dove hai il backend (es. `/home/ubuntu/F1-Stats/backend` e non `F1-Start` o `backend` da solo). Poi `sudo systemctl daemon-reload` e `sudo systemctl start f1-stats-backend`.

Log:

```bash
journalctl -u f1-stats-backend -f
```

---

## 9. URL del backend

- In produzione userai: **`http://TUO_IP_PUBBLICO:8000`** (es. `http://132.145.xxx.xxx:8000`).
- Su **Vercel** imposta la variabile d’ambiente:
  - **Nome:** `NEXT_PUBLIC_API_URL`
  - **Valore:** `http://132.145.xxx.xxx:8000` (con il **tuo** IP).

**Importante:** se il frontend è su **Vercel (HTTPS)**, il browser può bloccare le richieste verso un backend **HTTP** (mixed content). In quel caso il frontend mostrerà "Backend not reachable" anche se il backend risponde. Soluzioni: (1) per i test usa il frontend in **locale** (`npm run dev`) con `NEXT_PUBLIC_API_URL=http://92.4.172.23:8000`; (2) in produzione metti il backend dietro HTTPS (es. nginx + Let’s Encrypt sulla VM) e usa `https://...` in `NEXT_PUBLIC_API_URL`.

(Opzionale: più avanti puoi mettere un dominio e nginx con HTTPS e usare `https://api.tuodominio.com`.)

---

## 10. Se il backend non è raggiungibile dall’esterno

### Usa HTTP, non HTTPS

Il backend risponde in **HTTP**. L’URL corretto è:

- **Sì:** `http://92.4.172.23:8000/health`
- **No:** `https://92.4.172.23:8000/health` (il backend non ha certificato TLS)

Prova da browser o da PowerShell: `Invoke-WebRequest -Uri "http://92.4.172.23:8000/health"`

### Porta 8000 aperta nella Security List

Se con **http** ancora non risponde, quasi sempre la porta **8000** non è aperta nella VCN:

1. Oracle Cloud → **Networking** → **Virtual cloud networks**.
2. Clicca sulla VCN della tua VM (quella della subnet della VM).
3. Sotto **Security Lists** apri la **Default Security List** (o quella associata alla subnet pubblica).
4. In **Ingress Rules** deve esserci una regola con **Destination port range** = `8000`, **Source CIDR** = `0.0.0.0/0`, **Protocol** = TCP.
5. Se manca, **Add Ingress Rules** come nella sezione 2 sopra.

Attenzione: a volte la subnet ha una **security list diversa** dalla “Default”. Controlla nella pagina della **Subnet** quale Security List è associata e modifica quella.

### Firewall sulla VM (ufw)

Sulla VM (in SSH) verifica se il firewall blocca la porta 8000:

```bash
sudo ufw status
```

Se è `active` e la porta 8000 non è in elenco:

```bash
sudo ufw allow 8000/tcp
sudo ufw reload
```

Oppure, solo per test, puoi disabilitare ufw: `sudo ufw disable` (poi riattivalo e lascia solo `allow 8000`).

### Test da dentro la VM

Sulla VM (in SSH) prova:

```bash
curl http://127.0.0.1:8000/health
```

Se risponde `{"status":"ok",...}` il backend funziona; il problema è solo rete/firewall verso l’esterno (Security List o ufw).

### Security List giusta e Network Security Group (NSG)

- La **subnet** della VM ha una (o più) **Security List** associate. La regola sulla porta 8000 deve essere nella Security List **effettivamente usata** da quella subnet. In **VCN** → **Subnets** → clicca sulla subnet della tua VM → in basso vedi **Security Lists**; modifica quella lista (o tutte quelle elencate).
- **Dove trovare l’NSG (se c’è):**
  1. Menu ☰ → **Compute** → **Instances**.
  2. Clicca sul **nome** della tua istanza (es. f1-stats-backend).
  3. Nella pagina del dettaglio, nella **barra laterale sinistra** cerca la sezione **Resources** (o in alto le tab **Instance information** / **Resources**).
  4. Clicca su **Attached VNICs** (o **Primary VNIC**).
  5. Si apre l’elenco dei VNIC: clicca sul **nome del VNIC** (es. “Primary VNIC” o un link tipo `...vnic...`).
  6. Nella pagina del **VNIC** cerca di nuovo **Resources** (barra sinistra) e clicca **Network Security Groups**.
  7. Se vedi uno o più NSG collegati, clicca sul nome dell’NSG, poi **Add Ingress Rules** e aggiungi: Source `0.0.0.0/0`, TCP, Destination port `8000`.
- **Se non trovi “Attached VNICs” o “Network Security Groups”:** la tua VM potrebbe **non** avere un NSG collegato (è opzionale). In quel caso contano solo le **Security List** della subnet: assicurati che la regola sulla porta 8000 sia in quella lista. Se la regola c’è già e la porta resta chiusa, prova il test da Windows (`Test-NetConnection`) e verifica che il backend risponda in locale (`curl http://127.0.0.1:8000/health`).

### Verifica da fuori che la porta sia aperta

Da **Windows** (PowerShell), dal tuo PC:

```powershell
Test-NetConnection -ComputerName 92.4.172.23 -Port 8000
```

Se `TcpTestSucceeded : False`, qualcosa (VCN, NSG o firewall sulla VM) blocca ancora. Se `True`, la porta è aperta e il problema può essere il backend non in ascolto (controlla `systemctl status f1-stats-backend` e `curl http://127.0.0.1:8000/health` sulla VM).

### Riavvio

Non è necessario riavviare la VM per far applicare le regole VCN o ufw. Se hai fatto tutte le verifiche sopra e ancora non va, un riavvio può essere un tentativo finale (es. `sudo reboot` sulla VM), ma di solito il blocco è Security List sbagliata o NSG mancante.

### Diagnostica sulla VM: in ascolto su 0.0.0.0 e iptables

Se le regole sono corrette ma la porta resta irraggiungibile, sulla VM (in SSH) esegui:

**1. Verifica che il backend sia in ascolto su tutte le interfacce (0.0.0.0), non solo su localhost:**

```bash
ss -tlnp | grep 8000
```

- **Corretto:** `0.0.0.0:8000` o `*:8000` → il servizio accetta connessioni dall’esterno.
- **Sbagliato:** `127.0.0.1:8000` → il servizio ascolta solo in locale; in quel caso il comando di avvio deve usare `--host 0.0.0.0` (vedi sotto).

**2. Controlla il servizio systemd:**

```bash
cat /etc/systemd/system/f1-stats-backend.service
```

In `ExecStart` deve esserci **`--host 0.0.0.0`**. Se manca, modifica il file con `sudo nano /etc/systemd/system/f1-stats-backend.service`, aggiungi `--host 0.0.0.0` in `ExecStart`, poi:

```bash
sudo systemctl daemon-reload
sudo systemctl restart f1-stats-backend
```

**3. Controlla iptables (firewall a livello kernel):**

```bash
sudo iptables -L INPUT -n -v --line-numbers
```

Se vedi regole che **DROP** o **REJECT** la porta 8000 (o tutto il traffico in INPUT), devi consentire la 8000. Con **ufw** attivo di solito basta:

```bash
sudo ufw allow 8000/tcp
sudo ufw reload
sudo ufw status
```

**4. Prova ad ascoltare sulla porta 8000 con netcat (test temporaneo):**

Ferma il backend (`sudo systemctl stop f1-stats-backend`), poi:

```bash
sudo nc -l -p 8000
```

Da Windows esegui `Test-NetConnection -ComputerName 92.4.172.23 -Port 8000`. Se con `nc` il test riesce ma con il backend no, il problema è l’applicazione (binding o crash). Se neanche con `nc` funziona, il blocco è di rete (Security List / route).

### Test finale: tcpdump e bypass iptables

**A. Verifica se i pacchetti arrivano alla VM**

Sulla VM, in una finestra SSH, avvia:

```bash
sudo tcpdump -i any port 8000 -n
```

Lascia `tcpdump` in esecuzione. Da **Windows** esegui:

```powershell
Test-NetConnection -ComputerName 92.4.172.23 -Port 8000
```

- Se in `tcpdump` **non** compaiono righe quando lanci il test → il traffico viene **bloccato prima della VM** (Security List sbagliata o non applicata alla subnet giusta). Ricontrolla che la regola TCP 8000 sia nella Security List associata a **public subnet-F1Stats** (VCN → Subnets → public subnet-F1Stats → Security Lists).
- Se in `tcpdump` **compaino** pacchetti SYN ma il backend non risponde → il problema è **sulla VM** (firewall blocca in risposta, o app non risponde). Prova il passo B.

**B. Bypass temporaneo del firewall (iptables)**

Sulla VM (in un altro terminale SSH):

```bash
sudo iptables -I INPUT 1 -p tcp --dport 8000 -j ACCEPT
```

Riprova da Windows `Test-NetConnection` e `http://92.4.172.23:8000/health`. Se **funziona**, il blocco era iptables/ufw: allora `sudo ufw allow 8000/tcp`, `sudo ufw reload` e verifica con `sudo ufw status numbered`. La regola inserita a mano con iptables si perde al riavvio; ufw la rende persistente.

**C. Prova con la porta 80**

Per escludere un blocco sulla sola porta 8000, puoi aprire la **porta 80** nella Security List e avviare il backend sulla 80:

```bash
sudo systemctl stop f1-stats-backend
cd /home/ubuntu/F1-Stats/backend && source .venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 80
```

(Per avviare sulla 80 senza root serve `sudo setcap 'cap_net_bind_service=+ep' .venv/bin/python3` oppure avviare con sudo.) Da Windows prova `http://92.4.172.23:80/health`. Se la 80 funziona e la 8000 no, qualcosa (rete o firewall) tratta solo la 8000 in modo diverso.

---

## Riepilogo checklist

- [ ] VM creata e **Running**
- [ ] Porta **8000** aperta nella Security List (ingress)
- [ ] SSH funzionante
- [ ] Python 3.10+ e `pip`, `venv` installati
- [ ] Cartella **backend** sulla VM (clone o SCP)
- [ ] `.venv` creato e `pip install -r requirements.txt`
- [ ] File **`.env`** con `CORS_ORIGINS` (URL Vercel)
- [ ] Test: `python main.py` e `curl .../health`
- [ ] Servizio **systemd** abilitato e avviato
- [ ] Su Vercel: **NEXT_PUBLIC_API_URL** = `http://TUO_IP:8000`

Quando hai fatto questi passi, frontend (Vercel) e backend (Oracle) sono collegati.
