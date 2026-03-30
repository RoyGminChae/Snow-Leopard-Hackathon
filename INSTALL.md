# Install Directions

## 1. Clone the repository

```bash
git clone <your-repo-url>
cd Hackathon
```

## 2. Create and activate a virtual environment

### macOS or Linux

```bash
python3 -m venv venv
source venv/bin/activate
```

### Windows PowerShell

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

## 3. Install dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

## 4. Create a `.env` file

Add a `.env` file in the project root with your credentials:

```env
OPENAI_API_KEY=your_openai_api_key
SNOWLEOPARD_API_KEY=your_snowleopard_api_key
SNOWLEOPARD_DATAFILE_ID=your_datafile_id
MODEL_NAME=gpt-4o
```

Do not use `export` inside `.env` for this project. The script loads variables with `python-dotenv`.

## 5. Run the quickstart

```bash
python3 langchain_quickstart.py
```

You can also override the model from the command line:

```bash
python3 langchain_quickstart.py --model gpt-4o
```

## Notes

- `.env` and `venv` are already ignored by Git.
- The script expects valid OpenAI and SnowLeopard credentials before it will run successfully.