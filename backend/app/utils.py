# Helper functions or utilities (e.g., for data analysis)
import matplotlib
matplotlib.use('Agg')  # Use 'Agg' backend for non-GUI environments
import os
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.backends.backend_pdf import PdfPages
from flask import current_app


question_map = {
    "q1": "Before this installation, how often did you visit this site?",
    "q2": "Since the installation, how often do you visit this site?",
    "q3": "On average, how much time do you spend at this site per visit?",
    "q4": "What is your age group?",
    "q5": "What is your gender?",
    "q6": "What is your race/ethnicity?",
    "q7": "What is your zip code?",
    "q8": "How welcome do you feel on this site?",
    "q9": "How safe do you feel on this site?",
    "q10": "How comfortable do you feel on this site?",
    "q11": "How positive is your overall experience at this site?",
    "q12": "What activity best describes your time spent at this site?",
    "q13": "Has this installation made you more interested in exploring the surrounding neighborhood?",
}

installation_labels = {
    "1": "Common Ground",
    "2": "Breathing Pavilion",
}

rating_questions = ['q8', 'q9', 'q10', 'q11']

visit_duration_minutes = {
    'Less than 5 minutes': 2.5,
    '5-15 minutes': 10,
    '15-30 minutes': 22.5,
    '30 minutes to 1 hour': 45,
    'More than 1 hour': 75,
}

def normalize_single_value(value):
    if isinstance(value, list):
        return value[0] if value else ''
    return value or ''

def format_metric_number(value, digits=1):
    if value is None:
        return '0'
    if isinstance(value, (int, np.integer)):
        return str(int(value))
    if isinstance(value, (float, np.floating)):
        if np.isnan(value):
            return '0'
        if float(value).is_integer():
            return str(int(value))
        return f"{value:.{digits}f}"
    return str(value)

def format_duration(minutes):
    if minutes is None or minutes <= 0:
        return 'N/A'
    if minutes < 60:
        return f"{round(minutes)} min"
    return f"{minutes / 60:.1f} hr"

def filter_responses(responses, installation_id='all', zip_code='all'):
    filtered = []
    for response in responses:
        installation_matches = installation_id == 'all' or response.get('installationId') == installation_id
        zip_code_matches = zip_code == 'all' or normalize_single_value(response.get('q7')) == zip_code
        if installation_matches and zip_code_matches:
            filtered.append(response)
    return filtered

def calculate_dashboard_metrics(responses):
    unique_installations_count = len({response.get('installationId') for response in responses if response.get('installationId')})

    rating_values = []
    for response in responses:
        for question_id in rating_questions:
            value = normalize_single_value(response.get(question_id))
            try:
                numeric_value = float(value)
            except (TypeError, ValueError):
                continue
            if numeric_value > 0:
                rating_values.append(numeric_value)

    average_rating = float(np.mean(rating_values)) if rating_values else 0

    duration_values = []
    for response in responses:
        duration = visit_duration_minutes.get(normalize_single_value(response.get('q3')))
        if duration is not None:
            duration_values.append(duration)
    average_visit_duration = float(np.mean(duration_values)) if duration_values else 0

    zip_counts = {}
    for response in responses:
        zip_code = normalize_single_value(response.get('q7'))
        if zip_code:
            zip_counts[zip_code] = zip_counts.get(zip_code, 0) + 1
    top_zip_code_entry = sorted(zip_counts.items(), key=lambda item: item[1], reverse=True)[0] if zip_counts else None
    top_zip_code = f"{top_zip_code_entry[0]} ({top_zip_code_entry[1]})" if top_zip_code_entry else 'N/A'

    interest_answers = [normalize_single_value(response.get('q13')) for response in responses if normalize_single_value(response.get('q13'))]
    neighborhood_interest_rate = (sum(1 for answer in interest_answers if answer == 'Yes') / len(interest_answers) * 100) if interest_answers else 0

    activity_counts = {}
    for response in responses:
        activity = response.get('q12')
        values = activity if isinstance(activity, list) else [activity]
        for value in values:
            if value:
                activity_counts[value] = activity_counts.get(value, 0) + 1
    most_common_activity_entry = sorted(activity_counts.items(), key=lambda item: item[1], reverse=True)[0] if activity_counts else None
    most_common_activity = most_common_activity_entry[0] if most_common_activity_entry else 'N/A'

    return {
        'total_participants': format_metric_number(len(responses), 0),
        'total_installations': format_metric_number(unique_installations_count, 0),
        'avg_rating': format_metric_number(average_rating),
        'avg_visit_duration': format_duration(average_visit_duration),
        'top_zip_code': top_zip_code,
        'neighborhood_interest_rate': f"{format_metric_number(neighborhood_interest_rate, 0)}%",
        'most_common_activity': most_common_activity,
    }

def save_metrics_to_pdf(metrics, output_pdf_path, installation_id='all'):
    installation_label = installation_labels.get(installation_id, 'All Installations') if installation_id != 'all' else 'All Installations'

    fig = plt.figure(figsize=(8.5, 11))
    fig.patch.set_facecolor('#f5f8fc')

    fig.text(0.08, 0.95, 'Key Metrics Summary', fontsize=20, fontweight='bold', color='#102033')
    fig.text(0.08, 0.92, f'Installation filter: {installation_label}', fontsize=11, color='#4a5d73')

    cards = [
        ('Total Participants', metrics['total_participants'], '#dff4ff'),
        ('Total Installations', metrics['total_installations'], '#fff0d9'),
        ('Avg Rating', metrics['avg_rating'], '#e4f9ea'),
        ('Average Visit Duration', metrics['avg_visit_duration'], '#dce8ff'),
    ]

    positions = [
        (0.08, 0.73),
        (0.53, 0.73),
        (0.08, 0.56),
        (0.53, 0.56),
    ]

    for (label, value, color), (x, y) in zip(cards, positions):
        rect = plt.Rectangle((x, y), 0.36, 0.13, transform=fig.transFigure, facecolor=color, edgecolor='none')
        fig.patches.append(rect)
        fig.text(x + 0.03, y + 0.085, label, fontsize=11, color='#4a5d73', fontweight='bold')
        fig.text(x + 0.03, y + 0.035, str(value), fontsize=22, color='#102033', fontweight='bold')

    details_rect = plt.Rectangle((0.08, 0.24), 0.81, 0.22, transform=fig.transFigure, facecolor='white', edgecolor='#dbe4ef')
    fig.patches.append(details_rect)

    fig.text(0.11, 0.42, 'Supporting Metrics', fontsize=14, fontweight='bold', color='#102033')
    fig.text(0.11, 0.37, f"Top ZIP Code: {metrics['top_zip_code']}", fontsize=12, color='#24384d')
    fig.text(0.11, 0.33, f"Most Common Activity: {metrics['most_common_activity']}", fontsize=12, color='#24384d')
    fig.text(0.11, 0.29, f"Neighborhood Interest Rate: {metrics['neighborhood_interest_rate']}", fontsize=12, color='#24384d')

    fig.text(0.08, 0.14, 'Generated from filtered dashboard metrics.', fontsize=10, color='#6b7c8f')
    fig.savefig(output_pdf_path, bbox_inches='tight')
    plt.close(fig)

class SurveyAnalyzer:
    def __init__(self, responses, question_map):
        self.responses = responses  # list of dictionaries
        self.question_map = question_map
        self.df = pd.DataFrame(responses)

        # converting timestamps properly
        if 'submittedAt' in self.df.columns:
            self.df['submittedAt'] = pd.to_datetime(self.df['submittedAt'], errors='coerce')

        # converting numeric survey questions to floats
        numeric_questions = ['q8', 'q9', 'q10', 'q11']
        for q in numeric_questions:
            if q in self.df.columns:
                self.df[q] = pd.to_numeric(self.df[q], errors='coerce')  # coerce bad data to NaN

    def get_response_count(self):
        """returns the number of total survey responses"""
        return len(self.df)
    
    def summarize_multiple_choice(self, question_id):
        """returns summary for multiple choice questions"""
        if question_id not in self.df.columns:
            return None

        # flatten all responses into a single list
        all_answers = self.df[question_id].dropna().tolist()
        flattened = []
        for ans in all_answers:
            if isinstance(ans, list):
                flattened.extend(ans)
            else:
                flattened.append(ans)

        if not flattened:
            return None

        counts = pd.Series(flattened).value_counts()
        percentages = (counts / len(self.df)) * 100

        summary = pd.DataFrame({
            'Answer': counts.index,
            'Count': counts.values,
            'Percentage': percentages.values.round(2)
        })
        return summary


    def summarize_numeric_question(self, question_id):
        """summarizing numeric questions"""
        if question_id not in self.df.columns:
            return None
        return {
            'Average': self.df[question_id].mean(),
            'Minimum': self.df[question_id].min(),
            'Maximum': self.df[question_id].max(),
            'Confidence Interval (95%)': self.calculate_confidence_interval(self.df[question_id])
        }

    def calculate_confidence_interval(self, data_series):
        """calculates 95% confidence interval"""
        data = data_series.dropna()
        n = len(data)
        if n == 0:
            return (None, None)
        mean = np.mean(data)
        std_error = np.std(data, ddof=1) / np.sqrt(n)
        margin = 1.96 * std_error  # for 95% confidence
        return (round(mean - margin, 2), round(mean + margin, 2))

    def export_summary_csv(self, filepath):
        """exports the summarized survey results as csv file"""
        with open(filepath, 'w') as f:
            f.write(f"Total Responses,{self.get_response_count()}\n\n")
            for qid, question_text in self.question_map.items():
                f.write(f"Question:,{question_text}\n")
                if qid in ['q8', 'q9', 'q10', 'q11']:  # these are the scale questions
                    stats = self.summarize_numeric_question(qid)
                    if stats:
                        for key, value in stats.items():
                            f.write(f"{key},{value}\n")
                else:
                    summary = self.summarize_multiple_choice(qid)
                    if summary is not None:
                        summary.to_csv(f, index=False)
                f.write("\n")

    def export_summary_excel(self, filepath):
        """exports summarized survey results as excel file"""
        with pd.ExcelWriter(filepath) as writer:
            for qid, question_text in self.question_map.items():
                if qid in ['q8', 'q9', 'q10', 'q11']:  # these are the scale question
                    stats = self.summarize_numeric_question(qid)
                    if stats:
                        df_stats = pd.DataFrame(list(stats.items()), columns=['Metric', 'Value'])
                        df_stats.to_excel(writer, sheet_name=qid[:30], index=False)
                else:
                    summary = self.summarize_multiple_choice(qid)
                    if summary is not None:
                        summary.to_excel(writer, sheet_name=qid[:30], index=False)

    def generate_graphs(self, output_dir):
        """outputs bar charts for each question"""
        os.makedirs(output_dir, exist_ok=True)

        for qid, question_text in self.question_map.items():
            if qid not in self.df.columns:
                continue
            summary = self.summarize_multiple_choice(qid)
            if summary is None:
                continue

            plt.figure(figsize=(8, 6))
            if qid in ['q4', 'q5', 'q6', 'q7']:  # these are the demographic questions
                plt.pie(summary['Count'], labels=summary['Answer'], autopct='%1.1f%%', startangle=140)
                plt.title(f"{question_text}")
                plt.axis('equal')
            else:
                plt.bar(summary['Answer'], summary['Count'])
                plt.title(f"{question_text}")
                plt.xticks(rotation=45, ha='right')
                plt.tight_layout()

            plt.savefig(os.path.join(output_dir, f"{qid}.png"))
            plt.close()

    def summarize_timestamp_location(self):
        """analyzes submission timestamps """
        summary = {}
        if 'timestamp' in self.df.columns:
            summary['first_submission'] = self.df['timestamp'].min()
            summary['last_submission'] = self.df['timestamp'].max()
        if 'location' in self.df.columns:
            location_counts = self.df['location'].value_counts()
            summary['top_locations'] = location_counts.to_dict()
        return summary

def save_graphs_to_pdf(input_folder, output_pdf_path, question_map):
    pdf = PdfPages(output_pdf_path)

    # sorting all .png files alphabetically
    image_files = sorted([f for f in os.listdir(input_folder) if f.endswith('.png')])

    for image_file in image_files:
        qid = image_file.replace('.png', '')  # extracting qid from filename

        img_path = os.path.join(input_folder, image_file)
        img = plt.imread(img_path)

        # creating a new figure for each image
        fig, ax = plt.subplots(figsize=(8, 6))
        ax.imshow(img)
        ax.axis('off')  # hide axes

        # adding question as title
        title = question_map.get(qid, qid)  # handling title error
        plt.title(title, fontsize=12, pad=20)

        pdf.savefig(fig, bbox_inches='tight')
        plt.close(fig)

    pdf.close()
    print(f"PDF saved successfully at {output_pdf_path}")

def load_responses_from_firestore():
    db = current_app.db  # using the Firestore database from the Flask app
    responses_ref = db.collection('surveyResponses')
    docs = responses_ref.stream()

    responses = []
    for doc in docs:
        response = doc.to_dict()
        response['id'] = doc.id  
        responses.append(response)
    
    return responses

def clean_firestore_responses(raw_responses, question_map):
    cleaned = []
    for doc in raw_responses:
        flattened = {}
        responses = doc.get('responses', {})
        for qid in question_map.keys():
            answer = responses.get(qid, None)
            if isinstance(answer, list) and len(answer) == 1:
                flattened[qid] = answer[0]  # Take the single item
            else:
                flattened[qid] = answer  # None or multi-answer
        # Add optional metadata fields if useful
        flattened['submittedAt'] = doc.get('submittedAt', None)
        flattened['installationId'] = doc.get('installationId', None)
        cleaned.append(flattened)
    return cleaned
