import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# Load dataset
df = pd.read_csv('Motor_Vehicle_Collisions_-_Crashes_20260805.csv', low_memory=False)
df.columns = df.columns.str.strip()

# Filter for 2023 crash data
df['CRASH DATE'] = pd.to_datetime(df['CRASH DATE'], errors='coerce')
df_2023 = df[df['CRASH DATE'].dt.year == 2023].copy()

# Selected contributing factors for direct comparison
target_factors = [
    'Driver Inattention/Distraction',
    'Failure to Yield Right-of-Way',
    'Following Too Closely',
    'Unsafe Speed',
    'Alcohol Involvement',
    'Cell Phone (hand-Held)'
]

# Calculate crash counts per factor
factor_counts = df_2023['CONTRIBUTING FACTOR VEHICLE 1'].value_counts()
comparison_df = pd.DataFrame({
    'Factor': target_factors,
    'Count': [factor_counts.get(f, 0) for f in target_factors]
})

# Create plot canvas
plt.figure(figsize=(10, 5))

# Highlight 'Driver Inattention/Distraction' in bright blue and others in gray
colors = ['#2563eb' if f == 'Driver Inattention/Distraction' else '#94a3b8' for f in comparison_df['Factor']]

# Plot horizontal bar chart
ax = sns.barplot(data=comparison_df, x='Count', y='Factor', palette=colors)

# Add exact count numbers next to each bar
for p in ax.patches:
    width = p.get_width()
    ax.annotate(f'{int(width):,}',
                (width + 300, p.get_y() + p.get_height() / 2.),
                ha='left', va='center',
                fontsize=10, fontweight='bold', color='#1e293b')

# Formatting labels and titles
plt.title('2023 NYC Collisions: Driver Inattention vs. Other Contributing Factors', fontsize=12, fontweight='bold', pad=15)
plt.xlabel('Number of Collisions', fontsize=10)
plt.ylabel('', fontsize=10)
plt.xlim(0, 28000)
plt.tight_layout()

# Save image and render
plt.savefig('contributing_factors_comparison.png', dpi=300)
plt.show()