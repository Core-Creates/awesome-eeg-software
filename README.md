# Awesome EEG Software [![Awesome](https://awesome.re/badge.svg)](https://awesome.re)

> A curated, verified list of open-source software for reading, preprocessing, analyzing, decoding, and acquiring EEG — from MATLAB classics like EEGLAB, FieldTrip, and Brainstorm to the MNE-Python ecosystem, BCI/deep-learning libraries, open hardware, and sleep/clinical tooling — plus verified public datasets for EEG, ECoG/sEEG, MEG, fNIRS, and human single-neuron electrophysiology.

**Inclusion bar:** every entry must contain **meaningful code** and be either **novel** (a capability no other entry provides) or **exceptionally well engineered** (tests, CI, docs, packaging, active maintenance). Each repository was checked against the GitHub/GitLab APIs for source size, tests, CI, commits in the last 12 months, and license file. Entries that fall short in a specific way carry an italic note instead of being silently included. [Datasets](#datasets-data-not-code) are listed separately and labeled as data, not code.

Licenses matter here: several major MATLAB toolboxes are **GPL**, so read the [licensing notes](#licensing-notes) before you vendor code into your own project.

**Last verified:** 2026-10-03

## Contents

- [Choosing a stack](#choosing-a-stack)
- [Core platforms](#core-platforms)
- [EEGLAB plugins and MATLAB pipelines](#eeglab-plugins-and-matlab-pipelines)
- [MNE-Python ecosystem](#mne-python-ecosystem)
- [Preprocessing and artifact handling](#preprocessing-and-artifact-handling)
- [Spectral, oscillation, and feature analysis](#spectral-oscillation-and-feature-analysis)
- [Connectivity, microstates, and hyperscanning](#connectivity-microstates-and-hyperscanning)
- [Regression, encoding models, and simulation](#regression-encoding-models-and-simulation)
- [Source localization](#source-localization)
- [BCI, machine learning, and deep learning](#bci-machine-learning-and-deep-learning)
- [Sleep and clinical EEG](#sleep-and-clinical-eeg)
- [Acquisition, hardware, and real-time streaming](#acquisition-hardware-and-real-time-streaming)
- [File formats, viewers, and I/O](#file-formats-viewers-and-io)
- [R and Julia](#r-and-julia)
- [Data standards and platforms](#data-standards-and-platforms)
- [Datasets (data, not code)](#datasets-data-not-code)
- [Licensing notes](#licensing-notes)

## Choosing a stack

| Goal | Recommended starting point |
|---|---|
| ERP / cognitive study, GUI-first | [EEGLAB](#core-platforms) + ICLabel + ERPLAB |
| Free, scriptable, reproducible pipeline | [MNE-Python](#core-platforms) + MNE-BIDS-Pipeline + autoreject + mne-icalabel |
| Source imaging with a GUI | [Brainstorm](#core-platforms) |
| Beamformers, connectivity, cluster stats in MATLAB | [FieldTrip](#core-platforms) |
| Oscillations: aperiodic, bursts, cycles | [specparam, NeuroDSP, bycycle](#spectral-oscillation-and-feature-analysis) |
| Microstates or two-brain (hyperscanning) studies | [Pycrostates, HyPyP](#connectivity-microstates-and-hyperscanning) |
| Overlapping ERPs, continuous speech/TRFs | [Unfold.jl, Eelbrain](#regression-encoding-models-and-simulation) |
| BCI / decoding / deep learning / foundation models | MNE + [Braindecode, MOABB, pyRiemann](#bci-machine-learning-and-deep-learning) |
| Sleep staging and microstructure | MNE + [YASA](#sleep-and-clinical-eeg), or [Luna](#sleep-and-clinical-eeg) for large cohorts |
| Infant / high-artifact data | [HAPPE](#eeglab-plugins-and-matlab-pipelines), [RELAX](#eeglab-plugins-and-matlab-pipelines), or [Automagic](#eeglab-plugins-and-matlab-pipelines) |
| OpenBCI, Muse, Mentalab, other headsets | [OpenBCI GUI, BrainFlow, LSL, device SDKs](#acquisition-hardware-and-real-time-streaming) → MNE |

## Core platforms

| Project | Language | License | Description |
|---|---|---|---|
| [EEGLAB](https://github.com/sccn/eeglab) | MATLAB | BSD-2-Clause (core; plugins vary) | Interactive EEG/MEG toolbox from SCCN (UCSD). ICA-centric workflow, GUI with full script history, STUDY group analysis, huge plugin ecosystem. [Docs](https://eeglab.org) |
| [MNE-Python](https://github.com/mne-tools/mne-python) | Python | BSD-3-Clause | Full MEG/EEG/sEEG/ECoG/fNIRS library: `Raw` → `Epochs` → `Evoked`, ICA, time-frequency, source imaging, cluster statistics, scikit-learn decoding. Exports EEGLAB files via the small [eeglabio](https://github.com/jackz314/eeglabio) helper. [Docs](https://mne.tools) |
| [Brainstorm](https://github.com/brainstorm-tools/brainstorm3) | MATLAB / Java | GPL-3.0 | GUI-driven MEG/EEG/fNIRS/ECoG/sEEG application with a strong focus on source imaging. A compiled standalone runs without a MATLAB license. [Docs](https://neuroimage.usc.edu/brainstorm/) |
| [FieldTrip](https://github.com/fieldtrip/fieldtrip) | MATLAB | GPL-3.0 | Script-based MEG/EEG/iEEG toolbox (Donders Institute). Beamformers, frequency analysis, connectivity, nonparametric cluster-based statistics. [Docs](https://www.fieldtriptoolbox.org) |
| [SPM](https://github.com/spm/spm) | MATLAB | GPL-2.0 | Statistical Parametric Mapping. Its M/EEG module provides Bayesian source reconstruction and Dynamic Causal Modelling (DCM). |
| [OpenViBE](https://gitlab.inria.fr/openvibe/openvibe) | C++ | AGPL-3.0 | Real-time BCI platform (Inria) with a visual "box" designer for acquisition, processing, and online classification. Hosted on Inria GitLab. [Site](https://openvibe.inria.fr/) |

## EEGLAB plugins and MATLAB pipelines

| Project | License | Description |
|---|---|---|
| [ICLabel](https://github.com/sccn/ICLabel) | BSD-2-Clause | Automatic classification of independent components (brain, eye, muscle, heart, line noise, channel noise, other). |
| [clean_rawdata](https://github.com/sccn/clean_rawdata) | GPL-3.0 | Artifact Subspace Reconstruction (ASR) and bad-channel/flatline detection for continuous data. |
| [AMICA](https://github.com/sccn/amica) | BSD-2-Clause | Adaptive Mixture ICA, often the highest-quality ICA decomposition for EEG. *No tests or CI; last commit 2024-07.* |
| [ERPLAB](https://github.com/ucdavis/erplab) | GPL-3.0 | ERP-focused processing, measurement, and statistics, tightly integrated with EEGLAB. |
| [LIMO EEG](https://github.com/LIMO-EEG-Toolbox/limo_tools) | MIT | Hierarchical linear modelling of M/EEG data across all time points and channels. |
| [SIFT](https://github.com/sccn/SIFT) | GPL (custom terms) | Source Information Flow Toolbox: multivariate causal/connectivity analysis. *No tests or CI; dormant since 2024-08.* |
| [PREP pipeline](https://github.com/VisLab/EEG-Clean-Tools) | *No license file* | Standardized early-stage preprocessing: line-noise removal, robust referencing, bad-channel detection. *Last release v0.57.0 (2025-03); for Python use [PyPREP](#preprocessing-and-artifact-handling).* |
| [HAPPE](https://github.com/PINE-Lab/HAPPE) | GPL-3.0 | Harvard Automated Processing Pipeline for EEG. Built for high-artifact and developmental/infant data. *No tests or CI.* |
| [RELAX](https://github.com/NeilwBailey/RELAX) | GPL-3.0 | Automated cleaning pipeline combining multi-channel Wiener filtering with wavelet-enhanced ICA. *No tests or CI.* |
| [Automagic](https://github.com/methlabUZH/automagic) | GPL-3.0 | Automated preprocessing and quality rating of large EEG datasets. *No tests or CI; last release v3.0 (2023).* |

## MNE-Python ecosystem

| Project | License | Description |
|---|---|---|
| [MNE-BIDS](https://github.com/mne-tools/mne-bids) | BSD-3-Clause | Read and write BIDS-compatible datasets with MNE. |
| [MNE-BIDS-Pipeline](https://github.com/mne-tools/mne-bids-pipeline) | BSD-3-Clause | Configurable, fully automated processing of entire BIDS datasets. |
| [mne-icalabel](https://github.com/mne-tools/mne-icalabel) | BSD-3-Clause | Python port of ICLabel for automatic ICA component labelling. |
| [mne-connectivity](https://github.com/mne-tools/mne-connectivity) | BSD-3-Clause | Spectral and time-resolved connectivity estimators. |
| [mne-features](https://github.com/mne-tools/mne-features) | BSD-3-Clause | Feature extraction from multivariate time series for ML. |
| [mne-qt-browser](https://github.com/mne-tools/mne-qt-browser) | BSD-3-Clause | Fast Qt-based 2D data browser backend for MNE. |
| [mne-nirs](https://github.com/mne-tools/mne-nirs) | BSD-3-Clause | fNIRS processing; useful for combined EEG-fNIRS studies. |
| [MNELAB](https://github.com/cbrnr/mnelab) | BSD-3-Clause | Point-and-click GUI on top of MNE-Python. |

## Preprocessing and artifact handling

| Project | Language | License | Description |
|---|---|---|---|
| [autoreject](https://github.com/autoreject/autoreject) | Python | BSD-3-Clause | Automated, cross-validated rejection and repair of bad epochs and sensors. |
| [PyPREP](https://github.com/sappelhoff/pyprep) | Python | MIT | Python implementation of the PREP pipeline. |
| [MEEGkit](https://github.com/nbara/python-meegkit) | Python | BSD-3-Clause | Denoising toolkit: ASR, DSS, ZapLine line-noise removal, STAR, TRCA. |

## Spectral, oscillation, and feature analysis

| Project | Language | License | Description |
|---|---|---|---|
| [specparam (FOOOF)](https://github.com/fooof-tools/fooof) | Python | Apache-2.0 | Parameterizes power spectra into periodic (oscillatory) and aperiodic (1/f) components. [Docs](https://specparam-tools.github.io) |
| [NeuroDSP](https://github.com/neurodsp-tools/neurodsp) | Python | Apache-2.0 | Neural signal processing: filtering, burst detection, time-frequency, rhythmicity, and simulation of periodic/aperiodic signals. |
| [bycycle](https://github.com/bycycle-tools/bycycle) | Python | Apache-2.0 | Cycle-by-cycle analysis of oscillations: waveform shape, amplitude, period, and burst detection in the time domain. |
| [AntroPy](https://github.com/raphaelvallat/antropy) | Python | BSD-3-Clause | Fast entropy and complexity measures (permutation, spectral, sample entropy; fractal dimensions; DFA). |
| [Tensorpac](https://github.com/EtienneCmb/tensorpac) | Python | BSD-3-Clause | Vectorized phase-amplitude coupling (PAC) estimation with surrogates and statistics. *No commits since 2024-07.* |
| [fCWT](https://github.com/fastlib/fCWT) | C++ (Python bindings) | Apache-2.0 | Fast continuous wavelet transform, orders of magnitude faster than standard implementations, for high-resolution time-frequency analysis. *Last push 2025-01.* |
| [NeuroKit2](https://github.com/neuropsychology/NeuroKit) | Python | MIT | General neurophysiological signal processing (ECG, EDA, EMG, RSP, EEG) and complexity measures. *EEG is a minor part of its scope.* |
| [Wonambi](https://github.com/wonambi-python/wonambi) | Python | BSD-3-Clause | Visualization and analysis of EEG/ECoG, including sleep scoring and event detection. |

## Connectivity, microstates, and hyperscanning

| Project | Language | License | Description |
|---|---|---|---|
| [Pycrostates](https://github.com/vferat/pycrostates) | Python | BSD-3-Clause | EEG microstate analysis (clustering, segmentation, back-fitting, metrics), built on MNE. |
| [HyPyP](https://github.com/ppsp-team/HyPyP) | Python | BSD-3-Clause | Hyperscanning pipeline for inter-brain synchrony and connectivity across simultaneously recorded participants. |
| [Frites](https://github.com/brainets/frites) | Python | BSD-3-Clause | Information-theoretic (Gaussian-copula mutual information) analysis of electrophysiology with group-level, cluster-corrected statistics. |
| [Spectral Connectivity](https://github.com/Eden-Kramer-Lab/spectral_connectivity) | Python | GPL-3.0 | Multitaper spectral and connectivity measures (coherence, Granger, PLV, …) with optional GPU acceleration. |
| [conpy](https://github.com/AaltoImagingLanguage/conpy) | Python | BSD-3-Clause | All-to-all source-space connectivity using DICS beamforming, built on MNE. |
| [bctpy](https://github.com/aestrivex/bctpy) | Python | GPL-3.0 | Python port of the Brain Connectivity Toolbox: graph-theoretical measures on connectivity matrices. |

## Regression, encoding models, and simulation

| Project | Language | License | Description |
|---|---|---|---|
| [Unfold.jl](https://github.com/unfoldtoolbox/Unfold.jl) | Julia | MIT | Regression-based ERP analysis with deconvolution of overlapping responses, mixed models, and splines. Successor to the MATLAB [unfold](https://github.com/unfoldtoolbox/unfold) toolbox. |
| [Eelbrain](https://github.com/Eelbrain/Eelbrain) | Python | BSD-3-Clause | Temporal response functions (boosting) for continuous stimuli such as speech, plus mass-univariate statistics on M/EEG. |
| [SEREEGA](https://github.com/lrkrol/SEREEGA) | MATLAB | GPL-3.0-or-later | Simulates event-related EEG with known ground truth using realistic head models; useful for validating pipelines. *Last push 2023-07.* |

## Source localization

Most source-imaging work happens in the core platforms. Use **Brainstorm** for a GUI, **MNE-Python** for scripted distributed/beamformer methods, **FieldTrip** for beamformers in MATLAB, **SPM** for Bayesian/DCM, and EEGLAB's DIPFIT for equivalent-dipole fitting of ICA components.

| Project | Language | License | Description |
|---|---|---|---|
| [OpenMEEG](https://github.com/openmeeg/openmeeg) | C++ (Python bindings) | CeCILL-B | Symmetric boundary-element (BEM) forward modelling for EEG/MEG/ECoG; used by Brainstorm, FieldTrip, and MNE. |
| [Visbrain](https://github.com/EtienneCmb/visbrain) | Python | BSD-3-Clause | GPU-accelerated 3D brain visualization, including sources and connectivity. *No commits in 12 months; last release 2018.* |

## BCI, machine learning, and deep learning

| Project | Language | License | Description |
|---|---|---|---|
| [Braindecode](https://github.com/braindecode/braindecode) | Python | BSD-3-Clause | Deep learning for EEG/ECG/MEG in PyTorch. Ships tested implementations of EEGNet and of foundation models such as LaBraM, BIOT, EEGPT, CBraMod, BENDR, and U-Sleep, so prefer it over the original paper repositories. |
| [MOABB](https://github.com/NeuroTechX/moabb) | Python | BSD-3-Clause | Mother of All BCI Benchmarks: standardized evaluation across public BCI datasets. |
| [pyRiemann](https://github.com/pyRiemann/pyRiemann) | Python | BSD-3-Clause | Riemannian-geometry ML on covariance matrices. A strong baseline for many BCI tasks. |
| [BciPy](https://github.com/CAMBI-tech/BciPy) | Python | BSD-3-Clause | End-to-end BCI experiment framework (RSVP and matrix spellers): acquisition, stimulus presentation, signal models, and language models. |
| [TorchEEG](https://github.com/torcheeg/torcheeg) | Python | MIT | PyTorch datasets, transforms, and models for EEG. *Overlaps Braindecode; last release 2024-12.* |

## Sleep and clinical EEG

| Project | Language | License | Description |
|---|---|---|---|
| [YASA](https://github.com/raphaelvallat/yasa) | Python | BSD-3-Clause | Automatic sleep staging, spindle and slow-wave detection, and bandpower for polysomnography. |
| [Luna](https://github.com/remnrem/luna-base) | C/C++ (R and Python interfaces) | GPL-3.0 | High-performance toolset for large-scale sleep EEG/PSG studies: artifact handling, spectral analysis, spindle/SO detection, and staging. |
| [SleepECG](https://github.com/cbrnr/sleepecg) | Python | BSD-3-Clause | Sleep stage detection from ECG; complements EEG-based staging. *ECG, not EEG.* |

For clinical and sleep **datasets** (HEEDB, TUH, CHB-MIT, Sleep-EDF), see [Datasets](#datasets-data-not-code).

## Acquisition, hardware, and real-time streaming

| Project | Language | License | Description |
|---|---|---|---|
| [BrainFlow](https://github.com/brainflow-dev/brainflow) | C++ (+ Python, Java, C#, R, Julia, Rust bindings) | MIT | Unified SDK for many research and consumer biosensor boards (OpenBCI, Muse, and more). |
| [Lab Streaming Layer (liblsl)](https://github.com/sccn/liblsl) | C++ | MIT | The de facto standard for time-synchronized streaming of EEG, markers, and other sensors. Python bindings: [pylsl](https://github.com/labstreaminglayer/pylsl). Apps and docs: [labstreaminglayer](https://github.com/sccn/labstreaminglayer). |
| [MNE-LSL](https://github.com/mne-tools/mne-lsl) | Python | BSD-3-Clause | Real-time streaming and processing with MNE-Python on top of LSL. |
| [OpenBCI GUI](https://github.com/OpenBCI/OpenBCI_GUI) | Processing / Java | MIT | Official OpenBCI desktop app for Cyton and Ganglion boards: live visualization, recording, filtering, and LSL/UDP/OSC networking (uses BrainFlow). *No commits on the default branch in 12 months; last push 2026-04.* |
| [OpenBCI board firmware](https://github.com/OpenBCI/OpenBCI_Cyton_Library) | C++ | MIT | Firmware for the open-hardware Cyton (ADS1299) board; see also the [Ganglion library](https://github.com/OpenBCI/OpenBCI_Ganglion_Library). *Firmware; no tests or CI.* |
| [muse-lsl](https://github.com/alexandrebarachant/muse-lsl) | Python | BSD-3-Clause | Stream, record, and visualize data from Interaxon Muse headsets over LSL. |
| [explorepy](https://github.com/Mentalab-hub/explorepy) | Python | MIT | Python API and CLI for Mentalab Explore devices: streaming, recording, impedance checks, and LSL push. |
| [Neurosity SDK](https://github.com/neurosity/neurosity-sdk-js) | TypeScript | MIT | Official JavaScript/TypeScript SDK for Neurosity Crown headsets: raw EEG, PSD, and metrics streams. |
| [Timeflux](https://github.com/timeflux/timeflux) | Python | MIT | Graph-based framework for real-time acquisition, processing, and BCI applications using pluggable nodes. *No commits since 2024-12.* |
| [FreeEEG32](https://github.com/neuroidss/FreeEEG32-beta) | C (STM32 firmware) + KiCad | AGPL-3.0 | Open-hardware 32-channel EEG board: schematics, PCB, and firmware; compatible with BrainFlow and OpenViBE. *Hardware project; low commit activity.* |
| [EEG-ExPy](https://github.com/NeuroTechX/EEG-ExPy) | Python | BSD-3-Clause | Ready-to-run cognitive experiments for low-cost EEG devices. |

## File formats, viewers, and I/O

| Project | Language | License | Description |
|---|---|---|---|
| [EDFbrowser](https://gitlab.com/Teuniz/EDFbrowser) | C++ / Qt | GPL-3.0 | Fast, free viewer and toolbox for EDF/EDF+/BDF and other time-series formats. Hosted on GitLab. [Site](https://www.teuniz.net/edfbrowser/) |
| [edfio](https://github.com/the-siesta-group/edfio) | Python | Apache-2.0 | Modern, typed, pure-Python reading and writing of EDF/EDF+/BDF/BDF+ with lazy loading and strict validation. |
| [pyEDFlib](https://github.com/holgern/pyedflib) | Python / C | BSD-3-Clause | Read and write EDF+/BDF+ files via the C EDFlib library. |
| [Neo](https://github.com/NeuralEnsemble/python-neo) | Python | BSD-3-Clause | Readers for dozens of electrophysiology file formats into a common data model; used by MNE, SpikeInterface, and others. |
| [pyxdf](https://github.com/xdf-modules/pyxdf) | Python | BSD-2-Clause | Load XDF recordings (the LSL recording format). |

**Cross-tool interop tips**

- MNE reads EEGLAB files with `mne.io.read_raw_eeglab` and `mne.read_epochs_eeglab`, and exports to them with `mne.export.export_raw`.
- Brainstorm and FieldTrip both import EEGLAB `.set` and BIDS datasets directly.
- When moving data between tools, use **BIDS** as the common format.

## R and Julia

| Project | Language | License | Description |
|---|---|---|---|
| [eeguana](https://github.com/bnicenboim/eeguana) | R | MIT | Tidy, data.table-backed EEG manipulation in R: reading BrainVision/EDF/FieldTrip files, preprocessing, ICA, and ggplot-based plotting. |

See also [Unfold.jl](#regression-encoding-models-and-simulation) for Julia, and Luna's R interface in [Sleep and clinical EEG](#sleep-and-clinical-eeg).

## Data standards and platforms

Software and specifications for organizing, validating, and hosting data.

| Resource | Type | License | Description |
|---|---|---|---|
| [BIDS specification](https://github.com/bids-standard/bids-specification) | Specification | CC-BY-4.0 | Brain Imaging Data Structure, including the EEG and iEEG extensions. [Site](https://bids.neuroimaging.io) |
| [BIDS validator](https://github.com/bids-standard/bids-validator) | Software (TypeScript) | MIT | Checks that datasets conform to BIDS. |
| [OpenNeuro](https://github.com/OpenNeuroOrg/openneuro) | Platform (TypeScript/Python) | MIT | Source code of [openneuro.org](https://openneuro.org), the free public repository of BIDS datasets, including many EEG and iEEG studies. |
| [NEMAR](https://nemar.org) | Platform (hosted service) | — | NeuroElectroMagnetic data Archive and Resource. Runs OpenNeuro EEG/MEG data through EEGLAB on HPC. |
| [Brain Data Science Platform (BDSP)](https://bdsp.io) | Platform (hosted service) | — | Hosts the Harvard EEG Database (HEEDB) and other large clinical datasets (credentialed access). |

## Datasets (data, not code)

These entries are **data**, not software. They are exempt from the code bar above, but each one was checked against its official source on the verification date: OpenNeuro, DANDI, and Figshare names and licenses via their APIs, and PhysioNet titles and access levels from their pages.

**Access key:** **Open** means download without an account. **Registration** means a free account or request form. **Credentialed** means a data-use agreement and/or training is required.

- [Scalp EEG](#scalp-eeg)
- [Sleep and polysomnography](#sleep-and-polysomnography)
- [Intracranial EEG: ECoG and sEEG](#intracranial-eeg-ecog-and-seeg)
- [MEG and simultaneous MEG/EEG](#meg-and-simultaneous-megeeg)
- [fNIRS and hybrid EEG-fNIRS](#fnirs-and-hybrid-eeg-fnirs)
- [HEG (hemoencephalography)](#heg-hemoencephalography)
- [Human single-neuron and microelectrode electrophysiology](#human-single-neuron-and-microelectrode-electrophysiology)

### Scalp EEG

| Dataset | Focus | Access | Description |
|---|---|---|---|
| [Harvard EEG Database (HEEDB)](https://bdsp.io) | Clinical | Credentialed (BDSP) | Large multi-hospital clinical EEG archive with linked reports. Helper repo: [Harvard-EEG-Database-Tools](https://github.com/bdsp-core/Harvard-EEG-Database-Tools) (MIT), with EDF reading via MNE, report-timestamp alignment, LLM-based label extraction from reports, and dataset statistics. *The repo is mostly bundled metadata and notebooks, with about 23 KB of scripts.* |
| [TUH EEG Corpus](https://isip.piconepress.com/projects/nedc/html/tuh_eeg/) | Clinical | Registration | Temple University Hospital clinical EEG corpus, including seizure (TUSZ) and artifact subsets. |
| [CHB-MIT Scalp EEG](https://physionet.org/content/chbmit/) | Epilepsy | Open (PhysioNet) | Pediatric seizure recordings. |
| [Siena Scalp EEG](https://physionet.org/content/siena-scalp-eeg/) | Epilepsy | Open (PhysioNet) | Adult epilepsy recordings with annotated seizures. |
| [Healthy Brain Network EEG (ds005505)](https://openneuro.org/datasets/ds005505) | Development | Open (OpenNeuro, CC-BY-SA 4.0) | Release 1 of the pediatric HBN EEG data in BIDS (resting state and tasks); further releases are separate OpenNeuro accessions. |
| [MPI-Leipzig LEMON](https://fcon_1000.projects.nitrc.org/indi/retro/MPI_LEMON.html) | Resting state | Open | Mind-Brain-Body dataset: resting-state EEG with MRI and extensive phenotyping of young and older adults. |
| [ERP CORE](https://erpinfo.org/erp-core) | ERPs | Open (OSF) | Reference recordings and pipelines for seven widely studied ERP components from six paradigms. |
| [Face processing EEG (ds002718)](https://openneuro.org/datasets/ds002718) | ERPs | Open (OpenNeuro, CC0) | EEG portion of the Wakeman & Henson face study, prepared for EEGLAB tutorials. |
| [Alzheimer's, FTD, and healthy EEG (ds004504)](https://openneuro.org/datasets/ds004504) | Clinical | Open (OpenNeuro, CC0) | Resting-state EEG from Alzheimer's disease, frontotemporal dementia, and healthy control groups. |
| [UC San Diego Parkinson's resting EEG (ds002778)](https://openneuro.org/datasets/ds002778) | Clinical | Open (OpenNeuro, CC0) | Resting-state EEG from patients with Parkinson's disease and controls. |
| [EEG During Mental Arithmetic](https://physionet.org/content/eegmat/) | Cognitive load | Open (PhysioNet) | EEG at rest and during serial-subtraction mental arithmetic. |
| [EEG Motor Movement/Imagery](https://physionet.org/content/eegmmidb/) | BCI | Open (PhysioNet) | Classic 109-subject motor execution/imagery dataset. |
| [BCI Competition IV](https://www.bbci.de/competition/iv/) | BCI | Open | Benchmark motor-imagery and related BCI datasets (including the widely used 2a/2b sets). |

### Sleep and polysomnography

| Dataset | Focus | Access | Description |
|---|---|---|---|
| [Sleep-EDF Expanded](https://physionet.org/content/sleep-edfx/) | Staging | Open (PhysioNet) | Whole-night polysomnography with expert sleep stages; a standard sleep-staging benchmark. |
| [Haaglanden Medisch Centrum sleep staging](https://physionet.org/content/hmc-sleep-staging/) | Staging | Open (PhysioNet) | Clinical PSG recordings with sleep-stage annotations from a Dutch sleep center. |
| [Sleep Heart Health Study (SHHS)](https://sleepdata.org/datasets/shhs) | Cohort | Credentialed (NSRR) | Large multi-center PSG cohort distributed by the National Sleep Research Resource. |

### Intracranial EEG: ECoG and sEEG

| Dataset | Type | Access | Description |
|---|---|---|---|
| [Epilepsy iEEG Multicenter (ds003029)](https://openneuro.org/datasets/ds003029) | ECoG + sEEG | Open (OpenNeuro, CC0) | Seizure recordings from epilepsy patients across multiple centers, in BIDS. |
| [Epilepsy iEEG Interictal Multicenter (ds003876)](https://openneuro.org/datasets/ds003876) | ECoG + sEEG | Open (OpenNeuro, CC0) | Interictal companion to ds003029. |
| [HUP iEEG Epilepsy (ds004100)](https://openneuro.org/datasets/ds004100) | ECoG + sEEG | Open (OpenNeuro, CC0) | Hospital of the University of Pennsylvania epilepsy iEEG recordings in BIDS. |
| [Interictal iEEG with HFO markings (ds003498)](https://openneuro.org/datasets/ds003498) | iEEG | Open (OpenNeuro, CC0) | Slow-wave-sleep iEEG with marked high-frequency oscillations; a standard HFO benchmark. |
| [RESPect intraoperative iEEG (ds003844)](https://openneuro.org/datasets/ds003844) | ECoG | Open (OpenNeuro, CC0) | Clinical intraoperative ECoG from epilepsy surgery, converted to BIDS. |
| [CCEP ECoG across ages 4–51 (ds004080)](https://openneuro.org/datasets/ds004080) | ECoG | Open (OpenNeuro, CC0) | Cortico-cortical evoked potentials (single-pulse stimulation) across development. |
| [sEEG forced two-choice task (ds004473)](https://openneuro.org/datasets/ds004473) | sEEG | Open (OpenNeuro, CC0) | Stereo-EEG recorded during a two-alternative forced-choice task, with MRI. |
| [iEEG-fMRI naturalistic film (ds003688)](https://openneuro.org/datasets/ds003688) | ECoG + sEEG + fMRI | Open (OpenNeuro, CC0) | Intracranial and fMRI responses to the same short audiovisual film. |
| ["Podcast" ECoG (ds005574)](https://openneuro.org/datasets/ds005574) | ECoG | Open (OpenNeuro, CC0) | ECoG recorded while participants listened to a naturalistic podcast story. |
| [AJILE12 (DANDI 000055)](https://dandiarchive.org/dandiset/000055) | ECoG + video pose | Open (DANDI, NWB) | Long-term naturalistic intracranial recordings with synchronized video-based pose tracking. |

### MEG and simultaneous MEG/EEG

| Dataset | Type | Access | Description |
|---|---|---|---|
| [Multisubject, multimodal face processing (ds000117)](https://openneuro.org/datasets/ds000117) | MEG + MRI | Open (OpenNeuro, CC0) | Wakeman & Henson face-perception study; a common tutorial dataset for MNE, SPM, and FieldTrip. |
| [Face processing MEEG with HED (ds003645)](https://openneuro.org/datasets/ds003645) | MEG + EEG + MRI | Open (OpenNeuro, CC0) | Simultaneous MEG/EEG face study with Hierarchical Event Descriptor (HED) annotations. |
| [THINGS-MEG (ds004212)](https://openneuro.org/datasets/ds004212) | MEG + MRI | Open (OpenNeuro, CC0) | Dense sampling of responses to thousands of object images in a few participants. |
| [MOUS](https://data.donders.ru.nl/collections/di/dccn/DSC_3011020.09_236) | MEG + fMRI | Registration (Donders) | Mother of Unification Studies: 204-subject multimodal language-processing dataset. |
| [Cam-CAN](https://www.cam-can.org/index.php?content=dataset) | MEG + MRI | Registration | Cambridge Centre for Ageing and Neuroscience lifespan cohort with resting and task MEG. |
| [OMEGA](https://omega.bic.mni.mcgill.ca) | MEG | Registration | The Open MEG Archive (McGill): resting-state MEG with anatomical MRI. |
| [HCP MEG](https://www.humanconnectome.org/study/hcp-young-adult/project-protocol/resting-state-meg) | MEG | Registration | Human Connectome Project resting and task MEG for a subset of the young-adult cohort. |

### fNIRS and hybrid EEG-fNIRS

| Dataset | Type | Access | Description |
|---|---|---|---|
| [TU Berlin hybrid EEG-NIRS BCI](https://doc.ml.tu-berlin.de/hBCI/) | EEG + fNIRS | Open | Shin et al. simultaneous EEG and NIRS for motor imagery and mental arithmetic BCI; see also their [cognitive-task dataset](http://doc.ml.tu-berlin.de/simultaneous_EEG_NIRS/) (n-back, discrimination, word generation). |
| [HEFMI-ICH](https://doi.org/10.6084/m9.figshare.28955456.v4) | EEG + fNIRS | Open (Figshare, CC BY 4.0) | Hybrid EEG-fNIRS motor-imagery dataset from intracerebral hemorrhage patients and controls. |
| [Multimodal fNIRS-EEG unilateral limb MI](https://www.nature.com/articles/s41597-026-07807-x) | EEG + fNIRS | Open (see article) | *Scientific Data* (2026) descriptor of a hybrid motor-imagery dataset; data links are in the article. |
| [fNIRS spatial attention decoding (ds004830)](https://openneuro.org/datasets/ds004830) | fNIRS | Open (OpenNeuro, CC0) | fNIRS recorded during complex audio-visual scene analysis, in BIDS. |
| [Mental workload: fNIRS + TCD](https://physionet.org/content/mental-fnirs/1.0/) | fNIRS + Doppler | Open (PhysioNet) | Prefrontal fNIRS with transcranial Doppler during an n-back task. |

### HEG (hemoencephalography)

**No public HEG dataset was found** as of 2026-10-03. The search covered Zenodo, OSF, Figshare, Mendeley Data, PhysioNet, OpenNeuro, Kaggle, Harvard Dataverse, IEEE DataPort, and the data-availability statements of HEG papers. Both nIR-HEG and pIR-HEG data appear to stay inside vendor systems or clinical studies. nIR-HEG measures prefrontal oxygenation with near-infrared light, so the closest open data are the prefrontal [fNIRS datasets](#fnirs-and-hybrid-eeg-fnirs) above. If you know of an open HEG dataset, please [contribute it](CONTRIBUTING.md).

### Human single-neuron and microelectrode electrophysiology

| Dataset | Type | Access | Description |
|---|---|---|---|
| [Human MTL neurons, declarative memory (DANDI 000004)](https://dandiarchive.org/dandiset/000004) | Single units | Open (DANDI, NWB) | Human medial temporal lobe single-neuron recordings during a declarative-memory task, with an NWB processing pipeline. |
| [Human neurons, Sternberg working memory (DANDI 000469)](https://dandiarchive.org/dandiset/000469) | Single units | Open (DANDI, NWB) | Single-neuron activity during a Sternberg working-memory task. |
| [MTL neurons + scalp and intracranial EEG (DANDI 000574)](https://dandiarchive.org/dandiset/000574) | Single units + iEEG + EEG | Open (DANDI, NWB) | Medial temporal lobe neurons recorded simultaneously with scalp and intracranial EEG during verbal working memory. |
| [Amygdala neurons + iEEG, aversive stimuli (DANDI 000576)](https://dandiarchive.org/dandiset/000576) | Single units + iEEG | Open (DANDI, NWB) | Amygdala neurons and intracranial EEG during aversive dynamic visual stimulation. |
| [Single neurons, iEEG, and fMRI during movies (DANDI 000623)](https://dandiarchive.org/dandiset/000623) | Single units + iEEG + fMRI | Open (DANDI, NWB) | Multimodal responses to movie watching in neurosurgical patients. |
| [Hippocampal PAC and working memory (DANDI 000673)](https://dandiarchive.org/dandiset/000673) | Single units + LFP | Open (DANDI, NWB) | Data for a study on phase-amplitude coupling of human hippocampal neurons in working-memory control. |

> **Privacy:** clinical EEG reports contain PHI. Run any LLM-based label extraction locally under your IRB/data-use agreement. Never send reports to hosted endpoints.

More public datasets: [MOABB](https://github.com/NeuroTechX/moabb) (BCI loaders), [OpenNeuro](https://openneuro.org) (search EEG, iEEG, MEG, or NIRS), [DANDI](https://dandiarchive.org) (NWB electrophysiology), and [PhysioNet](https://physionet.org).

## Licensing notes

| License family | Projects (examples) | What it means if you build on them |
|---|---|---|
| Permissive (BSD / MIT / Apache / CeCILL-B) | EEGLAB core, MNE ecosystem, ICLabel, AMICA, LIMO, Braindecode, MOABB, pyRiemann, YASA, BrainFlow, LSL, OpenBCI, OpenMEEG, Pycrostates, HyPyP, Frites | You can reuse, modify, and redistribute under almost any license if you keep attribution. |
| Copyleft (GPL-2/GPL-3/AGPL) | Brainstorm, FieldTrip, SPM, clean_rawdata, ERPLAB, HAPPE, RELAX, Automagic, SIFT, SEREEGA, Luna, Spectral Connectivity, bctpy, EDFbrowser, OpenViBE, FreeEEG32 | Distributing modified or combined code requires releasing it under a compatible GPL license. Calling them as separate tools, or linking them as git submodules, keeps your own code's license independent. |
| No license file | PREP (EEG-Clean-Tools) | Technically "all rights reserved". Ask the authors before redistributing. |

License labels are taken from each repository's license file as of the verification date. Always check the upstream repository before relying on them.

## Contributing

Contributions are welcome! Read the [contribution guidelines](CONTRIBUTING.md) first.

## License

[![CC0](https://licensebuttons.net/p/zero/1.0/88x31.png)](https://creativecommons.org/publicdomain/zero/1.0/)

To the extent possible under law, the contributors have waived all copyright and related rights to this list. Each linked project keeps its own license.
