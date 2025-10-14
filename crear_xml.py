import pandas as pd

def separar_nombre_apellido(valor):
    if pd.isnull(valor):
        return '', ''
    partes = valor.split()
    if len(partes) == 1:
        return partes[0], ''
    return ' '.join(partes[:-1]), partes[-1]

def separar_empresa_departamento(valor):
    if pd.isnull(valor):
        return '', ''
    partes = valor.split('-', 1)
    empresa = partes[0].strip()
    departamento = partes[1].strip() if len(partes) > 1 else ''
    return empresa, departamento

# Lee el archivo Excel
df = pd.read_excel('Control_acceso.xlsx', sheet_name="CONTROL DE ACCESO", header=None)
df.columns = ['documento_identidad', 'nombre_apellido', 'empresa_departamento', 'email', 'foto']

# Separa nombre y apellido
df[['nombre', 'apellido']] = df['nombre_apellido'].apply(lambda x: pd.Series(separar_nombre_apellido(x)))

# Separa empresa y departamento
df[['empresa', 'departamento']] = df['empresa_departamento'].apply(lambda x: pd.Series(separar_empresa_departamento(x)))

# Genera columna id incremental (desde 1)
df['id'] = range(1, len(df) + 1)



# Ordena columnas para el CSV final
df_final = df[['id', 'documento_identidad', 'nombre', 'apellido', 'empresa', 'departamento', 'email', 'foto']]

df_final = df_final[df_final['email'].notnull() & (df_final['email'] != '')]
df_final = df_final.drop_duplicates(subset=['email'])
# Guarda como CSV limpio
df_final.to_csv('accesos_limpio.csv', index=False, encoding='utf-8')
